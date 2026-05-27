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
