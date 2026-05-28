from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from datasets.models import Dataset

from .models import ChatMessage
from .serializers import ChatMessageSerializer
from .ai_provider import AIProvider


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

    # Contexto: columnas + dtypes (simple y rápido)
    schema = ''
    try:
        schema = f"Columns: {dataset.columns}\nDtypes: {dataset.dtypes}"
    except Exception:
        schema = f"Columns: {dataset.columns}"

    # Responder (para mantener compatibilidad, usamos answer_question con contexto)
    # Nota: query/SQL no está integrado aquí; se deja sql_generated/query_result en blanco.
    answer = provider.answer_question(question=str(content).strip(), context=schema)

    assistant_msg = ChatMessage.objects.create(
        dataset=dataset,
        role='assistant',
        content=answer,
    )

    # Responder con el mensaje nuevo (frontend puede renderizarlo)
    serialized = ChatMessageSerializer(assistant_msg)
    return Response({
        'message': serialized.data,
        'history': ChatMessageSerializer(
            ChatMessage.objects.filter(dataset=dataset).order_by('created_at'),
            many=True
        ).data
    }, status=status.HTTP_200_OK)


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
    return Response({'history': serialized.data}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
def clear_chat(request):
    dataset_id = request.data.get('dataset_id')
    if not dataset_id:
        # DRF puede no enviar body en algunos clientes; fallback a querystring
        dataset_id = request.query_params.get('dataset_id')

    if not dataset_id:
        return Response({'detail': 'dataset_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        dataset = Dataset.objects.get(id=dataset_id)
    except Dataset.DoesNotExist:
        return Response({'detail': 'Dataset no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    ChatMessage.objects.filter(dataset=dataset).delete()
    return Response({'detail': 'Chat limpiado'}, status=status.HTTP_200_OK)
