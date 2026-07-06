import re
from typing import Optional


class FallbackSQLGenerator:
    """Genera SQL para preguntas comunes sin depender de IA externa"""

    @staticmethod
    def _is_numeric_col(col: str, dtypes: dict = None) -> bool:
        if dtypes and col in dtypes:
            dtype_str = str(dtypes[col]).lower()
            return any(t in dtype_str for t in ['int', 'float', 'double', 'decimal', 'number', 'numeric'])
        numeric_keywords = ['edad', 'age', 'gasto', 'precio', 'price', 'salario', 'salary',
                           'score', 'count', 'total', 'monto', 'cantidad', 'quantity',
                           'año', 'year', 'altura', 'height', 'peso', 'weight', 'valor',
                           'id_cliente', 'id_']
        col_lower = col.lower()
        return any(kw in col_lower for kw in numeric_keywords)

    @staticmethod
    def _all_numeric(cols: list, dtypes: dict = None) -> list:
        result = []
        for col in cols:
            if FallbackSQLGenerator._is_numeric_col(col, dtypes):
                result.append(col)
        return result if result else (cols[:1] if cols else [])

    @staticmethod
    def generate(question: str, columns: list, dtypes: dict = None) -> Optional[str]:
        question_lower = question.lower().strip()

        # Detectar columnas en la pregunta - buscar coincidencias parciales
        question_words = set(question_lower.split())
        matched_columns = [col for col in columns if any(
            word in col.lower() or col.lower() in word for word in question_words
        )]
        # Si no hay match con palabras individuales, intentar match inverso (frase en nombre)
        if not matched_columns:
            for col in columns:
                col_parts = col.lower().replace('_', ' ').replace('-', ' ').split()
                if any(part in question_lower for part in col_parts):
                    matched_columns.append(col)

        # Helper: generate AVG for all numeric columns
        numeric_cols = FallbackSQLGenerator._all_numeric(columns, dtypes)

        # 1. Preguntas de promedio / media
        if any(word in question_lower for word in ['promedio', 'media', 'average', 'avg', 'mean']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT AVG(\"{col}\") AS \"promedio_{col}\" FROM data"
            if numeric_cols:
                avg_parts = [f'AVG(\"{c}\") AS \"promedio_{c}\"' for c in numeric_cols]
                return "SELECT " + ", ".join(avg_parts) + " FROM data"
            return None

        # 2. Preguntas de suma / total
        if any(word in question_lower for word in ['suma', 'sum', 'total', 'suma total']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT SUM(\"{col}\") AS \"total_{col}\" FROM data"
            if numeric_cols:
                sum_parts = [f'SUM(\"{c}\") AS \"total_{c}\"' for c in numeric_cols]
                return "SELECT " + ", ".join(sum_parts) + " FROM data"
            return None

        # 3. Preguntas de máximo
        if any(word in question_lower for word in ['máximo', 'maximo', 'mayor', 'más alto', 'max', 'maximum', 'mas alto']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT MAX(\"{col}\") AS \"max_{col}\" FROM data"
            if numeric_cols:
                max_parts = [f'MAX(\"{c}\") AS \"max_{c}\"' for c in numeric_cols]
                return "SELECT " + ", ".join(max_parts) + " FROM data"
            return None

        # 4. Preguntas de mínimo
        if any(word in question_lower for word in ['mínimo', 'minimo', 'menor', 'más bajo', 'min', 'minimum', 'mas bajo']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT MIN(\"{col}\") AS \"min_{col}\" FROM data"
            if numeric_cols:
                min_parts = [f'MIN(\"{c}\") AS \"min_{c}\"' for c in numeric_cols]
                return "SELECT " + ", ".join(min_parts) + " FROM data"
            return None

        # 5. Preguntas de conteo / cuántos
        if any(word in question_lower for word in ['cuántos', 'cuantos', 'count', 'conteo', 'número de', 'numero de']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT \"{col}\", COUNT(*) AS \"conteo\" FROM data GROUP BY \"{col}\" ORDER BY \"conteo\" DESC LIMIT 20"
            return "SELECT COUNT(*) AS \"total_filas\" FROM data"

        # 6. Preguntas de distribución / histograma
        if any(word in question_lower for word in ['distribución', 'distribucion', 'histograma', 'histogram', 'frecuencia']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT \"{col}\" FROM data WHERE \"{col}\" IS NOT NULL"
            return None

        # 7. Preguntas de correlación / relación
        if any(word in question_lower for word in ['correlación', 'correlacion', 'relación', 'relacion', 'correlation']):
            if len(matched_columns) >= 2:
                col1, col2 = matched_columns[:2]
                return f"SELECT \"{col1}\", \"{col2}\" FROM data WHERE \"{col1}\" IS NOT NULL AND \"{col2}\" IS NOT NULL"
            numeric_cols = [col for col in columns if col.lower() in ['edad', 'age', 'salario', 'salary', 'precio', 'price', 'altura', 'height', 'peso', 'weight']]
            if len(numeric_cols) >= 2:
                return f"SELECT \"{numeric_cols[0]}\", \"{numeric_cols[1]}\" FROM data WHERE \"{numeric_cols[0]}\" IS NOT NULL AND \"{numeric_cols[1]}\" IS NOT NULL LIMIT 100"
            return None

        # 8. Preguntas de agrupación / categorías
        if any(word in question_lower for word in ['agrupar', 'group', 'categoria', 'categoría', 'por']):
            cat_cols = [col for col in columns if col.lower() in question_lower]
            num_cols = [col for col in columns if any(n in col.lower() for n in ['edad', 'age', 'salario', 'salary', 'precio', 'price', 'cantidad', 'count', 'monto'])]
            if cat_cols and num_cols:
                return f"SELECT \"{cat_cols[0]}\", AVG(\"{num_cols[0]}\") AS \"promedio\" FROM data GROUP BY \"{cat_cols[0]}\" ORDER BY \"promedio\" DESC LIMIT 20"
            if cat_cols:
                return f"SELECT \"{cat_cols[0]}\", COUNT(*) AS \"conteo\" FROM data GROUP BY \"{cat_cols[0]}\" ORDER BY \"conteo\" DESC LIMIT 20"
            return None

        # 9. Gráfico de torta / pie / porcentaje
        if any(word in question_lower for word in ['torta', 'pie', 'pastel', 'porcentaje', 'circular']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT \"{col}\", COUNT(*) AS \"conteo\" FROM data WHERE \"{col}\" IS NOT NULL GROUP BY \"{col}\" ORDER BY \"conteo\" DESC"
            if columns:
                return f"SELECT \"{columns[0]}\", COUNT(*) AS \"conteo\" FROM data WHERE \"{columns[0]}\" IS NOT NULL GROUP BY \"{columns[0]}\" ORDER BY \"conteo\" DESC"
            return None

        # 10. Distribución por columna / agrupar por
        if any(word in question_lower for word in ['distribución por', 'distribucion por', 'distribuye', 'agrupa por']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT \"{col}\", COUNT(*) AS \"conteo\" FROM data WHERE \"{col}\" IS NOT NULL GROUP BY \"{col}\" ORDER BY \"conteo\" DESC"
            return None

        # 11. Mostrar datos / preview
        if any(word in question_lower for word in ['muestra', 'mostrar', 'ver', 'show', 'display', 'todos', 'datos', 'lista', 'listar', 'primeros']):
            return "SELECT * FROM data LIMIT 50"

        return None

    @staticmethod
    def generate_answer(question: str, result: dict, sql: str) -> str:
        """Genera una respuesta textual basada en el resultado de la query"""
        data = result.get('data', [])
        columns = result.get('columns', [])
        row_count = result.get('row_count', 0)

        if not data:
            return "No se encontraron datos para tu pregunta."

        question_lower = question.lower()

        if row_count == 1 and len(data[0]) >= 1:
            question_is_avg = any(w in question_lower for w in ['promedio', 'media', 'average', 'avg', 'mean'])
            question_is_max = any(w in question_lower for w in ['máximo', 'maximo', 'mayor', 'max'])
            question_is_min = any(w in question_lower for w in ['mínimo', 'minimo', 'menor', 'min'])
            question_is_sum = any(w in question_lower for w in ['suma', 'sum', 'total'])

            if len(data[0]) == 1:
                col = columns[0]
                val = list(data[0].values())[0]
                if question_is_avg:
                    col_name = col.replace('promedio_', '').replace('avg_', '')
                    return f"El promedio de **{col_name}** es **{val:.2f}**"
                if question_is_max:
                    col_name = col.replace('max_', '')
                    return f"El valor máximo de **{col_name}** es **{val}**"
                if question_is_min:
                    col_name = col.replace('min_', '')
                    return f"El valor mínimo de **{col_name}** es **{val}**"
                if question_is_sum:
                    col_name = col.replace('total_', '')
                    return f"La suma total de **{col_name}** es **{val:.2f}**"
                return f"El resultado es: **{val}**"

            # Multi-columna: varios resultados (promedios de todas las numéricas)
            lines = []
            row = data[0]
            prefix = "promedio" if question_is_avg else "máximo" if question_is_max else "mínimo" if question_is_min else "total"
            for col in columns:
                val = row.get(col)
                if val is None:
                    continue
                col_name = col.replace(f'{prefix}_', '').replace('promedio_', '').replace('max_', '').replace('min_', '').replace('total_', '')
                if isinstance(val, (int, float)):
                    if question_is_avg or question_is_sum:
                        lines.append(f"  • **{col_name}**: {val:.2f}")
                    else:
                        lines.append(f"  • **{col_name}**: {val}")
            if lines:
                return "Resultados:\n" + "\n".join(lines)
            return f"Se encontraron {row_count} resultados."

        if 'GROUP BY' in sql.upper():
            col_label = columns[0]
            agg_label = columns[1] if len(columns) > 1 else 'valor'
            preview = "\n".join([f"  • {r[col_label]}: {r.get(agg_label, '-')}" for r in data[:5]])
            return f"Se encontraron {row_count} grupos:\n\n{preview}"

        if row_count <= 50:
            return f"Se encontraron **{row_count}** registros."

        return f"Se encontraron **{row_count}** resultados para tu consulta."
