from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datasets.models import Dataset
from .models import ChatMessage
from .serializers import ChatMessageSerializer
from .ai_provider import AIProvider
from analysis.engines import SQLEngine
from chat.chart_generator import ChartGenerator
from chat.fallback_sql import FallbackSQLGenerator
import pandas as pd
from analysis.utils import get_csv_tempfile


@api_view(['POST'])
def send_message(request):
    """
    POST body:
      - dataset_id
      - content
    """
    dataset_id = request.data.get('dataset_id')
    content = request.data.get('content')

    if not dataset_id:
        return Response({'detail': 'dataset_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
    if not content or not str(content).strip():
        return Response({'detail': 'content es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dataset = Dataset.objects.get(id=dataset_id)
    except Dataset.DoesNotExist:
        return Response({'detail': 'Dataset no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Guardar mensaje del usuario
    user_msg = ChatMessage.objects.create(
        dataset=dataset,
        role='user',
        content=str(content).strip(),
    )

    columns_list = dataset.columns if isinstance(dataset.columns, list) else eval(dataset.columns)

    provider = AIProvider()

    # Contexto: columnas + dtypes
    schema = ''
    try:
        schema = f"Columns: {dataset.columns}\nDtypes: {dataset.dtypes}"
    except Exception:
        schema = f"Columns: {dataset.columns}"

    # Intentar generar SQL con AI
    sql = provider.generate_sql(str(content).strip(), schema)
    
    query_result = None
    sql_generated = None
    chart_config = None
    answer = None
    used_fallback = False

    # Limpiar SQL de posibles bloques markdown
    if sql:
        sql = sql.strip()
        import re as _re
        m = _re.search(r'```(?:sql)?\s*(.*?)```', sql, _re.DOTALL | _re.IGNORECASE)
        if m:
            sql = m.group(1).strip()
        # Extraer primer SELECT si hay texto alrededor
        m = _re.search(r'(SELECT\s+.+)', sql, _re.DOTALL | _re.IGNORECASE)
        if m:
            sql = m.group(1).strip()

    # Verificar si el SQL del AI es válido o si el AI falló
    is_valid_sql = (
        sql and
        sql.strip().upper().startswith('SELECT') and
        not sql.startswith('Error') and
        'table_name' not in sql.lower()
    )

    if not is_valid_sql:
        # Fallback: generar SQL local sin IA
        fallback_sql = FallbackSQLGenerator.generate(str(content).strip(), columns_list, dataset.dtypes)
        if fallback_sql:
            sql = fallback_sql
            is_valid_sql = True
            used_fallback = True

    if is_valid_sql:
        try:
            sql_fixed = sql
            import re
            # Replace qualified references (old_table.col → data.col)
            m = re.search(r'\bFROM\s+(\w+)', sql_fixed, re.IGNORECASE)
            if m:
                old_table = m.group(1)
                sql_fixed = re.sub(re.escape(old_table) + r'\.', 'data.', sql_fixed)
                sql_fixed = re.sub(r'\bFROM\s+' + re.escape(old_table), 'FROM data', sql_fixed, flags=re.IGNORECASE)
            sql_fixed = re.sub(r'\bFROM\s+"([^"]+)"', 'FROM data', sql_fixed, flags=re.IGNORECASE)
                    
            csv_path = get_csv_tempfile(dataset)
            if not csv_path:
                raise FileNotFoundError(
                    f"El archivo del dataset '{dataset.name}' no está disponible. "
                    "Debes subir el CSV nuevamente desde la sección de datasets."
                )
            engine = SQLEngine(csv_path)
            result = engine.execute(sql_fixed)
            
            if not result.get('error'):
                query_result = result
                sql_generated = sql
                
                # Generar gráfico automático
                chart_config = ChartGenerator.detect_chart_type(
                    result['data'],
                    result['columns']
                )
                
                # Generar respuesta basada en resultados
                if used_fallback:
                    answer = FallbackSQLGenerator.generate_answer(str(content).strip(), result, sql)
                else:
                    context = f"Query ejecutada: {sql}\n\nResultados:\n{str(result['data'][:5])}"
                    answer = provider.answer_question(str(content).strip(), context)
            else:
                answer = f"No pude ejecutar la consulta: {result['error']}"
        except Exception as e:
            answer = f"Error ejecutando SQL: {str(e)}"
    else:
        # No se pudo generar SQL - responder con chat general
        try:
            csv_path = get_csv_tempfile(dataset)
            if csv_path:
                df = pd.read_csv(csv_path)
                context = (
                    f"Dataset con {len(df)} filas y {len(df.columns)} columnas. "
                    f"Columnas: {', '.join(columns_list)}\n\n"
                    f"Primeras 5 filas:\n{df.head(5).to_string()}"
                )
            else:
                context = (
                    f"Dataset: {dataset.name}\n"
                    f"Columnas disponibles: {', '.join(columns_list)}\n"
                    f"Filas: {dataset.rows_count}\n"
                )
            answer = provider.chat(str(content).strip(), context)
        except Exception as e:
            answer = f"Error al analizar: {str(e)}"

    # Crear mensaje del asistente
    assistant_msg = ChatMessage.objects.create(
        dataset=dataset,
        role='assistant',
        content=answer,
        sql_generated=sql_generated,
        query_result={
            'data': query_result['data'] if query_result else [],
            'columns': query_result['columns'] if query_result else [],
            'chart': chart_config
        } if query_result else None
    )

    # Responder con el mensaje nuevo
    serialized = ChatMessageSerializer(assistant_msg)
    return Response(serialized.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def chat_history(request):
    dataset_id = request.query_params.get('dataset_id')
    if not dataset_id:
        return Response({'detail': 'dataset_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dataset = Dataset.objects.get(id=dataset_id)
    except Dataset.DoesNotExist:
        return Response({'detail': 'Dataset no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    messages = ChatMessage.objects.filter(dataset=dataset).order_by('created_at')
    serialized = ChatMessageSerializer(messages, many=True)
    return Response(serialized.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
def clear_chat(request):
    dataset_id = request.data.get('dataset_id')
    if not dataset_id:
        dataset_id = request.query_params.get('dataset_id')

    if not dataset_id:
        return Response({'detail': 'dataset_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dataset = Dataset.objects.get(id=dataset_id)
    except Dataset.DoesNotExist:
        return Response({'detail': 'Dataset no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    ChatMessage.objects.filter(dataset=dataset).delete()
    return Response({'detail': 'Chat limpiado'}, status=status.HTTP_204_NO_CONTENT)