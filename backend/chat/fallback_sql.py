import re
from typing import Optional


class FallbackSQLGenerator:
    """Genera SQL para preguntas comunes sin depender de IA externa"""

    @staticmethod
    def generate(question: str, columns: list) -> Optional[str]:
        question_lower = question.lower().strip()

        # Detectar columnas en la pregunta
        matched_columns = [col for col in columns if col.lower() in question_lower]

        # 1. Preguntas de promedio / media
        if any(word in question_lower for word in ['promedio', 'media', 'average', 'avg', 'mean']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT AVG(\"{col}\") AS \"promedio_{col}\" FROM data"
            return None

        # 2. Preguntas de suma / total
        if any(word in question_lower for word in ['suma', 'sum', 'total', 'suma total']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT SUM(\"{col}\") AS \"total_{col}\" FROM data"
            return None

        # 3. Preguntas de máximo
        if any(word in question_lower for word in ['máximo', 'maximo', 'mayor', 'más alto', 'max', 'maximum', 'mas alto']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT MAX(\"{col}\") AS \"max_{col}\" FROM data"
            return None

        # 4. Preguntas de mínimo
        if any(word in question_lower for word in ['mínimo', 'minimo', 'menor', 'más bajo', 'min', 'minimum', 'mas bajo']):
            if matched_columns:
                col = matched_columns[0]
                return f"SELECT MIN(\"{col}\") AS \"min_{col}\" FROM data"
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

        # 9. Mostrar datos / preview
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

        if row_count == 1 and len(data[0]) == 1:
            col = columns[0]
            val = list(data[0].values())[0]
            if any(w in question_lower for w in ['promedio', 'media', 'average', 'avg']):
                col_name = col.replace('promedio_', '').replace('avg_', '')
                return f"El promedio de **{col_name}** es **{val:.2f}**"
            if any(w in question_lower for w in ['máximo', 'maximo', 'mayor', 'max']):
                col_name = col.replace('max_', '')
                return f"El valor máximo de **{col_name}** es **{val}**"
            if any(w in question_lower for w in ['mínimo', 'minimo', 'menor', 'min']):
                col_name = col.replace('min_', '')
                return f"El valor mínimo de **{col_name}** es **{val}**"
            if any(w in question_lower for w in ['suma', 'sum', 'total']):
                col_name = col.replace('total_', '')
                return f"La suma total de **{col_name}** es **{val:.2f}**"
            return f"El resultado es: **{val}**"

        if 'GROUP BY' in sql.upper():
            col_label = columns[0]
            agg_label = columns[1] if len(columns) > 1 else 'valor'
            preview = "\n".join([f"  • {r[col_label]}: {r.get(agg_label, '-')}" for r in data[:5]])
            return f"Se encontraron {row_count} grupos:\n\n{preview}"

        if row_count <= 50:
            return f"Se encontraron **{row_count}** registros."

        return f"Se encontraron **{row_count}** resultados para tu consulta."
