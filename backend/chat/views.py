from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
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
        fallback_sql = FallbackSQLGenerator.generate(str(content).strip(), columns_list)
        if fallback_sql:
            sql = fallback_sql
            is_valid_sql = True
            used_fallback = True

    if is_valid_sql:
        try:
            sql_fixed = sql
            import re
            sql_fixed = re.sub(r'\bFROM\s+\w+', 'FROM data', sql_fixed, flags=re.IGNORECASE)
                    
            engine = SQLEngine(get_csv_tempfile(dataset))
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
            df = pd.read_csv(get_csv_tempfile(dataset))
            context = (
                f"Dataset con {len(df)} filas y {len(df.columns)} columnas. "
                f"Columnas: {', '.join(columns_list)}\n\n"
                f"Primeras 5 filas:\n{df.head(5).to_string()}"
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

@csrf_exempt
@action(detail=False, methods=['post'])
def message(self, request):
    """Envía un mensaje y obtiene respuesta del IA"""
    session_id = request.headers.get('X-Session-ID')
    dataset_id = request.data.get('dataset_id')
    user_message = request.data.get('content')
    
    if not session_id or not dataset_id or not user_message:
        return Response(
            {'error': 'dataset_id, content y X-Session-ID requeridos'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
        
        # Guardar mensaje del usuario
        user_msg = ChatMessage.objects.create(
            dataset=dataset,
            role='user',
            content=user_message
        )
        
        # Generar respuesta del IA
        ai_provider = AIProvider()
        
        columns_list = dataset.columns if isinstance(dataset.columns, list) else eval(dataset.columns)
        schema = f"Tabla 'data' con columnas: {', '.join(columns_list)}"
        
        # Intentar generar SQL
        sql = ai_provider.generate_sql(user_message, schema)
        
        query_result = None
        sql_generated = None
        response_text = None
        chart_config = None
        used_fallback = False

        # Limpiar SQL de posibles bloques markdown
        if sql:
            sql = sql.strip()
            import re as _re
            m = _re.search(r'```(?:sql)?\s*(.*?)```', sql, _re.DOTALL | _re.IGNORECASE)
            if m:
                sql = m.group(1).strip()
            m = _re.search(r'(SELECT\s+.+)', sql, _re.DOTALL | _re.IGNORECASE)
            if m:
                sql = m.group(1).strip()
        
        # Verificar si el SQL del AI es válido
        is_valid_sql = (
            sql and 
            sql.strip().upper().startswith('SELECT') and 
            not sql.startswith('Error') and
            'table_name' not in sql.lower()
        )
        
        if not is_valid_sql:
            # Fallback: generar SQL local sin IA
            fallback_sql = FallbackSQLGenerator.generate(str(user_message).strip(), columns_list)
            if fallback_sql:
                sql = fallback_sql
                is_valid_sql = True
                used_fallback = True
        
        # Si generó SQL válido, ejecutar
        if is_valid_sql:
            try:
                import re
                sql = re.sub(r'\bFROM\s+\w+', 'FROM data', sql, flags=re.IGNORECASE)
                engine = SQLEngine(get_csv_tempfile(dataset))
                result = engine.execute(sql)
                
                if not result.get('error'):
                    query_result = result
                    sql_generated = sql
                    
                    # Generar gráfico automáticamente
                    chart_config = ChartGenerator.detect_chart_type(
                        result['data'],
                        result['columns']
                    )
                    
                    # Generar respuesta explicando los resultados
                    if used_fallback:
                        response_text = FallbackSQLGenerator.generate_answer(str(user_message).strip(), result, sql)
                    else:
                        context = f"Resultados de la consulta: {len(result['data'])} filas encontradas.\nDatos: {str(result['data'][:3])}"
                        response_text = ai_provider.answer_question(user_message, context)
                else:
                    response_text = f"Error ejecutando SQL: {result['error']}"
            except Exception as e:
                response_text = f"Error: {str(e)}"
        elif not response_text:
            # No se pudo generar SQL - responder con chat general
            try:
                df = pd.read_csv(get_csv_tempfile(dataset))
                context = (
                    f"Dataset con {len(df)} filas y {len(df.columns)} columnas. "
                    f"Columnas: {', '.join(columns_list)}\n\n"
                    f"Primeras 5 filas:\n{df.head(5).to_string()}"
                )
                response_text = ai_provider.chat(user_message, context)
            except Exception as e:
                response_text = f"Error al analizar datos: {str(e)}"
        
        # Guardar mensaje del asistente
        assistant_msg = ChatMessage.objects.create(
            dataset=dataset,
            role='assistant',
            content=response_text,
            sql_generated=sql_generated,
            query_result={
                'data': query_result['data'] if query_result else [],
                'columns': query_result['columns'] if query_result else [],
                'chart': chart_config
            } if query_result else None
        )
        
        serializer = ChatMessageSerializer(assistant_msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )