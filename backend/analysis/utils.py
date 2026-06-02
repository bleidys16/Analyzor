import tempfile


def get_csv_tempfile(dataset):
    """Lee el CSV desde el storage de Django o desde csv_content en DB, y escribe a temporal"""
    content = None
    try:
        content = dataset.file.read()
        # Backfill: si el archivo existe pero no hay csv_content, guardarlo
        if content and not dataset.csv_content:
            try:
                from django.db.models import Model as _M
                dataset.csv_content = content.decode('utf-8')
                dataset.save(update_fields=['csv_content'])
            except Exception:
                pass
    except Exception:
        pass

    if not content and dataset.csv_content:
        content = dataset.csv_content.encode('utf-8')

    if not content:
        raise FileNotFoundError(
            f"El archivo {dataset.name} no está disponible en el servidor. "
            "Debes subir el CSV nuevamente."
        )

    f = tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False)
    f.write(content)
    f.close()
    return f.name


def generate_analysis_summary(dataset, analysis):
    if not analysis:
        return None

    columns = dataset.columns if isinstance(dataset.columns, list) else []
    dtypes = dataset.dtypes if isinstance(dataset.dtypes, dict) else {}

    numeric_cols = []
    categoric_cols = []

    for col in columns:
        dtype = analysis.data_quality.get(col, {}).get('dtype', dtypes.get(col, ''))
        if any(k in str(dtype).lower() for k in ['int', 'float', 'double', 'decimal']):
            numeric_cols.append(col)
        else:
            categoric_cols.append(col)

    return {
        'kpis': {
            'rows': dataset.rows_count or 0,
            'columns': len(columns),
            'numeric': len(numeric_cols),
            'categoric': len(categoric_cols),
            'size_kb': round((dataset.file_size or 0) / 1024, 1),
        },
        'columns_summary': [
            {
                'name': col,
                'dtype': analysis.data_quality.get(col, {}).get('dtype', dtypes.get(col, '—')),
                'null_pct': analysis.data_quality.get(col, {}).get('null_pct', 0),
                'unique_count': analysis.data_quality.get(col, {}).get('unique_count', 0),
                'cardinality': analysis.data_quality.get(col, {}).get('cardinality', 0),
                'is_numeric': col in numeric_cols,
                'mean': analysis.statistics.get(col, {}).get('mean') if col in numeric_cols else None,
                'median': analysis.statistics.get(col, {}).get('median') if col in numeric_cols else None,
                'min': analysis.statistics.get(col, {}).get('min') if col in numeric_cols else None,
                'max': analysis.statistics.get(col, {}).get('max') if col in numeric_cols else None,
            }
            for col in columns
        ],
        'statistics': {
            col: {
                'mean': s.get('mean'),
                'median': s.get('median'),
                'std': s.get('std'),
                'min': s.get('min'),
                'max': s.get('max'),
                'q25': s.get('q25'),
                'q75': s.get('q75'),
            }
            for col, s in analysis.statistics.items()
            if s.get('mean') is not None
        },
        'categorical': [
            {
                'name': col,
                'unique': s.get('unique', 0),
                'most_common': s.get('most_common', '—'),
                'cardinality': analysis.data_quality.get(col, {}).get('cardinality', 0),
                'null_pct': analysis.data_quality.get(col, {}).get('null_pct', 0),
            }
            for col, s in analysis.statistics.items()
            if s.get('mean') is None
        ],
        'anomalies': analysis.anomalies or [],
    }
