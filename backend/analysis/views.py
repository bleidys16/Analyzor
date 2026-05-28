import json
import pandas as pd
from collections import Counter
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from datasets.models import Dataset
from .models import Analysis, Query
from .serializers import AnalysisSerializer, QuerySerializer
from .engines import AnalysisEngine, SQLEngine
from .utils import generate_analysis_summary


@method_decorator(csrf_exempt, name='dispatch')
class AutoAnalyzeAPIView(APIView):
    """
    POST /api/analysis/auto-analyze/
    body: { dataset_id: <uuid> }
    header: X-Session-ID
    """
    def post(self, request):
        session_id = request.headers.get('X-Session-ID')
        dataset_id = request.data.get('dataset_id')

        if not session_id or not dataset_id:
            return Response(
                {'error': 'dataset_id y X-Session-ID requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)

            engine = AnalysisEngine(dataset.file.path)
            analysis_data = engine.run_full_analysis()

            analysis, _created = Analysis.objects.update_or_create(
                dataset=dataset,
                defaults={
                    'statistics': analysis_data['statistics'],
                    'correlations': analysis_data['correlations'],
                    'data_quality': analysis_data['data_quality'],
                    'anomalies': analysis_data['anomalies'],
                }
            )

            serializer = AnalysisSerializer(analysis)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class QueryAPIView(APIView):
    """
    POST /api/analysis/query/
    body: { dataset_id: <uuid>, sql: "..." }
    header: X-Session-ID
    """
    def post(self, request):
        session_id = request.headers.get('X-Session-ID')
        dataset_id = request.data.get('dataset_id')
        sql = request.data.get('sql')

        if not session_id or not dataset_id or not sql:
            return Response(
                {'error': 'dataset_id, sql y X-Session-ID requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)

            engine = SQLEngine(dataset.file.path)
            result = engine.execute(sql)

            query = Query.objects.create(
                dataset=dataset,
                sql=sql,
                results=result,
                execution_time=result['execution_time']
            )

            serializer = QuerySerializer(query)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class AnalysisDetailAPIView(APIView):
    """
    GET /api/analysis/<uuid:pk>/
    header: X-Session-ID
    """

    def get(self, request, pk=None):
        session_id = request.headers.get('X-Session-ID')

        if not session_id:
            return Response(
                {'error': 'X-Session-ID requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dataset = get_object_or_404(Dataset, id=pk, session_id=session_id)

        # Si no existe análisis, lo generamos aquí para evitar 404 permanente
        try:
            analysis = Analysis.objects.get(dataset=dataset)
        except Analysis.DoesNotExist:
            engine = AnalysisEngine(dataset.file.path)
            analysis_data = engine.run_full_analysis()
            analysis = Analysis.objects.create(
                dataset=dataset,
                statistics=analysis_data['statistics'],
                correlations=analysis_data['correlations'],
                data_quality=analysis_data['data_quality'],
                anomalies=analysis_data['anomalies'],
            )

        serializer = AnalysisSerializer(analysis)
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ColumnDistributionsAPIView(APIView):
    """
    POST /api/analysis/distributions/
    body: { dataset_id: <uuid> }
    header: X-Session-ID

    Retorna distribuciones inteligentes para todas las columnas
    """

    def post(self, request):
        session_id = request.headers.get('X-Session-ID')
        dataset_id = request.data.get('dataset_id')

        if not session_id or not dataset_id:
            return Response({'error': 'dataset_id y X-Session-ID requeridos'}, status=400)

        try:
            dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
            df = pd.read_csv(dataset.file.path)
            total_rows = len(df)

            numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            categorical_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]

            distributions = {}

            def is_id_column(name):
                lower = name.lower().replace('_', '').replace('-', '').replace(' ', '')
                id_keywords = ['id', 'codigo', 'code', 'dni', 'uuid', 'sku', 'key', 'pk', 'llave']
                return any(kw in lower for kw in id_keywords)

            # --- NUMERICAS: histograma ---
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) < 3:
                    continue
                # Saltar solo si el NOMBRE sugiere que es ID
                if is_id_column(col):
                    continue
                n_bins = min(10, max(3, series.nunique()))
                try:
                    counts, bins = pd.cut(series, bins=n_bins, retbins=True)
                except Exception:
                    continue
                dist = counts.value_counts().sort_index()
                bins_data = []
                for i in range(len(dist)):
                    low = bins[i]
                    high = bins[i + 1]
                    bins_data.append({
                        'label': f'{low:.1f}-{high:.1f}',
                        'count': int(dist.iloc[i]),
                    })
                distributions[col] = {
                    'type': 'numeric',
                    'chart': 'histogram',
                    'stats': {
                        'mean': float(series.mean()),
                        'median': float(series.median()),
                        'std': float(series.std()),
                        'min': float(series.min()),
                        'max': float(series.max()),
                        'q25': float(series.quantile(0.25)),
                        'q75': float(series.quantile(0.75)),
                    },
                    'bins': bins_data,
                }

            # --- CATEGORICAS: top 5 + Otros ---
            for col in categorical_cols:
                series = df[col].dropna().astype(str)
                if len(series) == 0:
                    continue
                counter = Counter(series)
                total_unique = len(counter)
                total_count = len(series)

                # IDs o nombres únicos: skip si todos distintos y >10
                if total_unique == total_count and total_unique > 10:
                    continue

                top_n = 5
                top_values = counter.most_common(top_n)
                top_sum = sum(c for _, c in top_values)
                others_count = total_count - top_sum

                values = [{'label': str(v), 'count': c, 'pct': round(c / total_count * 100, 1)} for v, c in top_values]
                if others_count > 0:
                    values.append({'label': 'Otros', 'count': others_count, 'pct': round(others_count / total_count * 100, 1)})

                chart = 'pie' if len(values) <= 4 else 'bar'

                distributions[col] = {
                    'type': 'categorical',
                    'chart': chart,
                    'values': values,
                    'total_unique': total_unique,
                }

            # --- SCATTER: primeras 2 numéricas ---
            valid_numeric = [c for c in numeric_cols if c in distributions]
            if len(valid_numeric) >= 2:
                x_col, y_col = valid_numeric[:2]
                x_series = df[x_col].dropna()
                y_series = df[y_col].dropna()
                common_idx = x_series.index.intersection(y_series.index)
                max_points = min(200, len(common_idx))
                step = max(1, len(common_idx) // max_points) if len(common_idx) > max_points else 1
                sampled_idx = common_idx[::step][:max_points]
                points = []
                for idx in sampled_idx:
                    points.append({
                        'x': float(x_series.loc[idx]),
                        'y': float(y_series.loc[idx]),
                    })
                distributions['__scatter__'] = {
                    'x_col': x_col,
                    'y_col': y_col,
                    'x_label': x_col,
                    'y_label': y_col,
                    'points': points,
                }

            # --- GROUPED BARS: categórica + numérica ---
            valid_categorical = [c for c in categorical_cols if c in distributions]
            if valid_categorical and valid_numeric:
                grouped = {}
                for cat_col in valid_categorical[:2]:
                    cat_series = df[cat_col].dropna().astype(str)
                    for num_col in valid_numeric[:3]:
                        num_series = df[num_col].dropna()
                        common = df.loc[cat_series.index.intersection(num_series.index)]
                        if len(common) < 3:
                            continue
                        grouped_key = f'{cat_col}__{num_col}'
                        group_data = []
                        # Usar los mismos top valores que ya calculamos
                        top_labels = [v['label'] for v in distributions[cat_col]['values'] if v['label'] != 'Otros']
                        for label in top_labels:
                            subset = common[cat_series == label]
                            if len(subset) == 0:
                                continue
                            group_data.append({
                                'label': str(label)[:20],
                                'mean': float(subset[num_col].mean()),
                                'count': len(subset),
                            })
                        if group_data:
                            grouped[grouped_key] = {
                                'cat_col': cat_col,
                                'num_col': num_col,
                                'chart': 'grouped_bar',
                                'groups': group_data,
                            }
                if grouped:
                    distributions['__grouped__'] = grouped

            return Response(distributions)

        except Exception as e:
            return Response({'error': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class AnalysisSummaryAPIView(APIView):
    """
    GET /api/analysis/<uuid:pk>/summary/
    Retorna resumen unificado para dashboard y PDF
    """
    def get(self, request, pk=None):
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return Response({'error': 'X-Session-ID requerido'}, status=400)

        dataset = get_object_or_404(Dataset, id=pk, session_id=session_id)

        try:
            analysis = Analysis.objects.get(dataset=dataset)
        except Analysis.DoesNotExist:
            engine = AnalysisEngine(dataset.file.path)
            analysis_data = engine.run_full_analysis()
            analysis = Analysis.objects.create(
                dataset=dataset,
                statistics=analysis_data['statistics'],
                correlations=analysis_data['correlations'],
                data_quality=analysis_data['data_quality'],
                anomalies=analysis_data['anomalies'],
            )

        summary = generate_analysis_summary(dataset, analysis)
        return Response(summary)
