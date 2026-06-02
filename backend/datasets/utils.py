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
    """Procesa CSV y extrae información (sin cargar el CSV completo)."""
    # Límites para que el upload responda rápido en Vercel
    PREVIEW_NROWS = 100
    DTYPE_SAMPLE_NROWS = 1000

    try:
        # Asegura que el stream está al inicio
        file.seek(0)

        # 1) Preview (solo primeras filas)
        preview_df = pd.read_csv(file, nrows=PREVIEW_NROWS)
        columns = preview_df.columns.tolist()

        # 2) Muestra para inferir dtypes
        file.seek(0)
        sample_df = pd.read_csv(file, nrows=DTYPE_SAMPLE_NROWS)

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

        # 3) rows_count: para evitar cargar todo, usamos aproximación razonable
        #    (si más adelante necesitas el conteo exacto, hazlo en background.)
        #    Aquí estimamos contando líneas del stream.
        file.seek(0)
        # Intento de conteo eficiente por bytes; funciona bien para CSV normales.
        # Resta el header (1 línea) si existe.
        lines = 0
        for _ in file:
            lines += 1
        rows_count = max(0, lines - 1)

        file_size = file.size

        preview_data = _sanitize(preview_df.to_dict(orient='records'))

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