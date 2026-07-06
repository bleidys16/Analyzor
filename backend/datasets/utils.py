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
    """Procesa CSV con una sola lectura y estimación de filas por tamaño."""
    SAMPLE_NROWS = 2000
    PREVIEW_NROWS = 100

    try:
        file.seek(0)

        # Una sola lectura para obtener todo: columnas, dtypes, preview
        sample_df = pd.read_csv(file, nrows=SAMPLE_NROWS)
        columns = sample_df.columns.tolist()
        actual_rows_read = len(sample_df)

        dtypes = {}
        for col in columns:
            dtype = str(sample_df[col].dtype)
            if 'int' in dtype:
                dtypes[col] = 'integer'
            elif 'float' in dtype:
                dtypes[col] = 'float'
            elif 'datetime' in dtype:
                dtypes[col] = 'datetime'
            else:
                dtypes[col] = 'string'

        preview_data = _sanitize(sample_df.head(PREVIEW_NROWS).to_dict(orient='records'))

        file_size = file.size

        # Estimar filas totales por tamaño (evita iterar todo el archivo)
        bytes_read = file.tell() if hasattr(file, 'tell') and file.tell() > 0 else file_size
        if actual_rows_read < SAMPLE_NROWS:
            rows_count = actual_rows_read
        else:
            rows_count = max(0, int(file_size * actual_rows_read / bytes_read) - 1)

        return {
            'columns': columns,
            'dtypes': dtypes,
            'rows_count': rows_count,
            'file_size': file_size,
            'preview_data': preview_data,
            'error': None,
        }
    except Exception as e:
        return {'error': str(e)}

def get_expiration_time():
    """Retorna tiempo de expiración (24h)"""
    return timezone.now() + timedelta(hours=24)