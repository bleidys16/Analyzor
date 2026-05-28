import json
from typing import Dict, Any, List

class ChartGenerator:
    """Genera configuraciones de gráficos basadas en resultados de queries"""
    
    @staticmethod
    def detect_chart_type(data: List[Dict], columns: List[str]) -> Dict[str, Any]:
        """Detecta el tipo de gráfico más apropiado"""
        if not data or len(data) == 0:
            return {'type': 'text', 'message': 'Sin datos para visualizar'}
        
        # Contar columnas numéricas
        numeric_cols = []
        categorical_cols = []
        
        for col in columns:
            if col not in data[0]:
                continue
            
            val = data[0][col]
            if isinstance(val, (int, float)):
                numeric_cols.append(col)
            else:
                categorical_cols.append(col)
        
        # Lógica de detección
        if len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            # Categoría + número = Bar chart
            return ChartGenerator._create_bar_chart(data, categorical_cols[0], numeric_cols[0])
        
        elif len(numeric_cols) >= 2:
            # Dos números = Scatter plot
            return ChartGenerator._create_scatter_chart(data, numeric_cols[0], numeric_cols[1])
        
        elif len(numeric_cols) == 1:
            # Un número = Distribución
            return ChartGenerator._create_distribution_chart(data, numeric_cols[0])
        
        else:
            return {'type': 'text', 'message': 'No se puede generar gráfico con estos datos'}
    
    @staticmethod
    def _create_bar_chart(data: List[Dict], x_col: str, y_col: str) -> Dict[str, Any]:
        """Crea configuración de bar chart"""
        chart_data = []
        for row in data[:20]:  # Limita a 20 filas
            chart_data.append({
                'name': str(row.get(x_col, 'N/A'))[:20],
                'value': float(row.get(y_col, 0)) if isinstance(row.get(y_col), (int, float)) else 0
            })
        
        return {
            'type': 'bar',
            'title': f'{y_col} por {x_col}',
            'data': chart_data,
            'x_axis': x_col,
            'y_axis': y_col,
        }
    
    @staticmethod
    def _create_scatter_chart(data: List[Dict], x_col: str, y_col: str) -> Dict[str, Any]:
        """Crea configuración de scatter plot"""
        chart_data = []
        for row in data[:50]:
            x_val = row.get(x_col)
            y_val = row.get(y_col)
            if isinstance(x_val, (int, float)) and isinstance(y_val, (int, float)):
                chart_data.append({
                    'x': float(x_val),
                    'y': float(y_val)
                })
        
        return {
            'type': 'scatter',
            'title': f'{y_col} vs {x_col}',
            'data': chart_data,
            'x_axis': x_col,
            'y_axis': y_col,
        }
    
    @staticmethod
    def _create_single_value_chart(data: List[Dict], col: str) -> Dict[str, Any]:
        """Crea un indicador visual para un solo valor numérico"""
        val = float(list(data[0].values())[0])
        return {
            'type': 'bar',
            'title': col.replace('_', ' ').title(),
            'data': [{'name': col.replace('_', ' ').title(), 'value': val}],
            'x_axis': 'Métrica',
            'y_axis': 'Valor',
        }

    @staticmethod
    def _create_distribution_chart(data: List[Dict], col: str) -> Dict[str, Any]:
        """Crea gráfico de distribución (histograma)"""
        values = []
        for row in data:
            val = row.get(col)
            if isinstance(val, (int, float)):
                values.append(float(val))
        
        if not values:
            return {'type': 'text', 'message': f'No hay valores numéricos en {col}'}
        
        if len(values) == 1:
            return ChartGenerator._create_single_value_chart(data, col)
        
        # Crear bins
        min_val = min(values)
        max_val = max(values)
        bin_count = min(10, len(set(values)))
        bin_size = (max_val - min_val) / bin_count if max_val != min_val else 1
        
        bins = {}
        for val in values:
            bin_idx = int((val - min_val) / bin_size) if bin_size > 0 else 0
            bin_idx = min(bin_idx, bin_count - 1)
            bin_label = f'{min_val + bin_idx * bin_size:.1f}'
            bins[bin_label] = bins.get(bin_label, 0) + 1
        
        chart_data = [
            {'range': label, 'count': count}
            for label, count in sorted(bins.items())
        ]
        
        return {
            'type': 'histogram',
            'title': f'Distribución de {col}',
            'data': chart_data,
            'column': col,
        }