import pandas as pd
import duckdb
import time
import requests
import tempfile
import io
from typing import Dict, List, Any, Union
import numpy as np

MAX_ANALYSIS_ROWS = 50000

class AnalysisEngine:
    """Motor para análisis automático de datos con muestreo para datasets grandes"""
    
    def __init__(self, csv_source: Union[str, io.BytesIO], total_rows: int = None):
        if isinstance(csv_source, io.BytesIO):
            df_full = pd.read_csv(csv_source)
        else:
            df_full = pd.read_csv(csv_source)
        
        total = len(df_full)
        if total_rows and total_rows > MAX_ANALYSIS_ROWS and total > MAX_ANALYSIS_ROWS:
            self.df = df_full.sample(n=MAX_ANALYSIS_ROWS, random_state=42)
            self.sampled = True
        else:
            self.df = df_full
            self.sampled = False
        
        self.columns = self.df.columns.tolist()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Calcula estadísticas por columna"""
        stats = {}
        
        for col in self.columns:
            if pd.api.types.is_numeric_dtype(self.df[col]):
                stats[col] = {
                    'mean': float(self.df[col].mean()) if not pd.isna(self.df[col].mean()) else None,
                    'median': float(self.df[col].median()) if not pd.isna(self.df[col].median()) else None,
                    'std': float(self.df[col].std()) if not pd.isna(self.df[col].std()) else None,
                    'min': float(self.df[col].min()) if not pd.isna(self.df[col].min()) else None,
                    'max': float(self.df[col].max()) if not pd.isna(self.df[col].max()) else None,
                    'q25': float(self.df[col].quantile(0.25)) if not pd.isna(self.df[col].quantile(0.25)) else None,
                    'q75': float(self.df[col].quantile(0.75)) if not pd.isna(self.df[col].quantile(0.75)) else None,
                }
            else:
                stats[col] = {
                    'unique': int(self.df[col].nunique()),
                    'most_common': str(self.df[col].mode()[0]) if len(self.df[col].mode()) > 0 else None,
                }
            
            stats[col]['null_count'] = int(self.df[col].isna().sum())
            stats[col]['null_pct'] = float(self.df[col].isna().sum() / len(self.df) * 100)
        
        return stats
    
    def get_correlations(self) -> Dict[str, Dict[str, float]]:
        """Calcula matriz de correlaciones"""
        numeric_df = self.df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {}
        
        corr_matrix = numeric_df.corr()
        
        corr_dict = {}
        for col1 in corr_matrix.columns:
            corr_dict[col1] = {}
            for col2 in corr_matrix.columns:
                corr_dict[col1][col2] = float(corr_matrix.loc[col1, col2])
        
        return corr_dict
    
    def get_data_quality(self) -> Dict[str, Dict[str, Any]]:
        """Análisis de calidad de datos"""
        quality = {}
        
        for col in self.columns:
            quality[col] = {
                'dtype': str(self.df[col].dtype),
                'unique_count': int(self.df[col].nunique()),
                'null_count': int(self.df[col].isna().sum()),
                'null_pct': float(self.df[col].isna().sum() / len(self.df) * 100),
                'cardinality': float(self.df[col].nunique() / len(self.df) * 100),
            }
        
        return quality
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Detecta anomalías básicas"""
        anomalies = []
        
        for col in self.columns:
            null_pct = self.df[col].isna().sum() / len(self.df) * 100
            if null_pct > 50:
                anomalies.append({
                    'type': 'high_missing',
                    'column': col,
                    'value': float(null_pct),
                    'message': f'Columna "{col}" tiene {null_pct:.1f}% de valores nulos'
                })
        
        for col in self.columns:
            unique_pct = self.df[col].nunique() / len(self.df) * 100
            if unique_pct < 1:
                anomalies.append({
                    'type': 'low_cardinality',
                    'column': col,
                    'value': float(unique_pct),
                    'message': f'Columna "{col}" tiene muy pocos valores únicos'
                })
        
        return anomalies
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """Ejecuta análisis completo"""
        return {
            'statistics': self.get_statistics(),
            'correlations': self.get_correlations(),
            'data_quality': self.get_data_quality(),
            'anomalies': self.detect_anomalies(),
        }


class SQLEngine:
    """Motor para ejecutar SQL contra datasets con DuckDB"""
    
    def __init__(self, csv_source: Union[str, io.BytesIO]):
        self.csv_source = csv_source
        self.con = duckdb.connect(':memory:')
    
    def execute(self, sql: str) -> Dict[str, Any]:
        """Ejecuta SQL y retorna resultados"""
        start_time = time.time()
        temp_path = None
        
        try:
            if isinstance(self.csv_source, io.BytesIO):
                with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as f:
                    f.write(self.csv_source.getvalue())
                    temp_path = f.name
            elif isinstance(self.csv_source, str) and self.csv_source.startswith('http'):
                response = requests.get(self.csv_source)
                with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                    f.write(response.text)
                    temp_path = f.name
            else:
                temp_path = self.csv_source
            
            self.con.execute(f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{temp_path}')")
            
            result = self.con.execute(sql).fetchall()
            columns = [desc[0] for desc in self.con.description]
            
            data = []
            for row in result:
                data.append(dict(zip(columns, row)))
            
            execution_time = (time.time() - start_time) * 1000
            
            return {
                'columns': columns,
                'data': data,
                'row_count': len(data),
                'execution_time': execution_time,
                'error': None
            }
        
        except Exception as e:
            return {
                'columns': [],
                'data': [],
                'row_count': 0,
                'execution_time': (time.time() - start_time) * 1000,
                'error': str(e)
            }
        
        finally:
            self.con.close()
            if temp_path and isinstance(self.csv_source, (io.BytesIO, str)):
                try:
                    import os
                    os.unlink(temp_path)
                except Exception:
                    pass
            