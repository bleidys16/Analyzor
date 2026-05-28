from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .chart_generator import ChartGenerator

from datasets.models import Dataset
from .models import ChatMessage
from .serializers import ChatMessageSerializer
from .ai_provider import AIProvider
from analysis.engines import SQLEngine
import pandas as pd


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

    provider = AIProvider()

    # Contexto: columnas + dtypes
    schema = ''
    try:
        schema = f"Columns: {dataset.columns}\nDtypes: {dataset.dtypes}"
    except Exception:
        schema = f"Columns: {dataset.columns}"

    # Intentar generar SQL
    sql = provider.generate_sql(str(content).strip(), schema)
    
    query_result = None
    sql_generated = None
    chart_config = None
    answer = None

    # Si parece SQL válido, ejecutar
    if sql.strip().upper().startswith('SELECT'):
        try:
            sql_fixed = sql
            sql_fixed = sql_fixed.replace('FROM clientes', 'FROM data')
            sql_fixed = sql_fixed.replace('FROM dataset', 'FROM data')
            sql_fixed = sql_fixed.replace('FROM datos', 'FROM data')
                    
            engine = SQLEngine(dataset.file.path)
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
                context = f"Query ejecutada: {sql}\n\nResultados:\n{str(result['data'][:5])}"
                answer = provider.answer_question(str(content).strip(), context)
            else:
                answer = f"No pude ejecutar la consulta: {result['error']}"
        except Exception as e:
            answer = f"Error ejecutando SQL: {str(e)}"
    else:
        # Si no es SQL, responder directamente
        try:
            df = pd.read_csv(dataset.file.path)
            context = f"Dataset con {len(df)} filas y {len(df.columns)} columnas. Columnas: {', '.join(df.columns.tolist())}"
            answer = provider.answer_question(str(content).strip(), context)
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