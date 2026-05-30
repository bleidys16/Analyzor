import math
import pandas as pd
from datetime import timedelta
from django.utils import timezone


def _sanitize(obj):
    """Convierte NaN/Inf a None para JSON válido en PostgreSQL"""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj

def validate_csv(file):
    """Valida que sea CSV válido"""
    try:
        df = pd.read_csv(file, nrows=5)
        return True, None
    except Exception as e:
        return False, str(e)

def process_csv(file):
    """Procesa CSV y extrae información"""
    try:
        df = pd.read_csv(file)
        
        columns = df.columns.tolist()
        rows_count = len(df)
        file_size = file.size
        
        # Detectar tipos de datos
        dtypes = {}
        for col in columns:
            dtype = str(df[col].dtype)
            if 'int' in dtype:
                dtypes[col] = 'integer'
            elif 'float' in dtype:
                dtypes[col] = 'float'
            elif 'datetime' in dtype:
                dtypes[col] = 'datetime'
            else:
                dtypes[col] = 'string'
        
        # Preview (primeras 100 filas)
        preview_data = _sanitize(df.head(100).to_dict(orient='records'))
        
        return {
            'columns': columns,
            'dtypes': dtypes,
            'rows_count': rows_count,
            'file_size': file_size,
            'preview_data': preview_data,
            'error': None
        }
    except Exception as e:
        return {'error': str(e)}

def get_expiration_time():
    """Retorna tiempo de expiración (24h)"""
    return timezone.now() + timedelta(hours=24)