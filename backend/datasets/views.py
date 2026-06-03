from rest_framework import viewsets, status
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from django.shortcuts import get_object_or_404
from .models import Dataset, DatasetPreview
from .serializers import DatasetSerializer, DatasetDetailSerializer
from .utils import validate_csv, process_csv, get_expiration_time


@method_decorator(csrf_exempt, name='dispatch')
class DatasetUploadView(APIView):
    """Endpoint para subir datasets CSV"""
    renderer_classes = [JSONRenderer]
    
    def post(self, request):
        """Subir dataset CSV"""
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            return Response({'error': 'X-Session-ID requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Validar
        is_valid, error = validate_csv(file)
        if not is_valid:
            return Response({'error': f'CSV inválido: {error}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Procesar
        file.seek(0)
        processed = process_csv(file)
        
        if processed.get('error'):
            return Response({'error': processed['error']}, status=status.HTTP_400_BAD_REQUEST)

        # Evitar duplicados: mismo nombre, misma sesión, mismo día
        file.seek(0)
        today = timezone.now().date()
        existing = Dataset.objects.filter(
            session_id=session_id,
            name=file.name.replace('.csv', ''),
            created_at__date=today
        ).first()
        if existing:
            serializer = DatasetDetailSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Crear dataset
        try:
            file.seek(0)
            csv_text = file.read().decode('utf-8') if hasattr(file, 'read') else ''
            if csv_text is None:
                csv_text = ''
            file.seek(0)
            dataset = Dataset.objects.create(
                session_id=session_id,
                name=file.name.replace('.csv', ''),
                file=file,
                csv_content=csv_text,
                columns=processed['columns'],
                rows_count=processed['rows_count'],
                file_size=processed['file_size'],
                dtypes=processed['dtypes'],
                expires_at=get_expiration_time()
            )
            
            # Crear preview
            DatasetPreview.objects.create(
                dataset=dataset,
                data=processed['preview_data']
            )
        except Exception as e:
            return Response(
                {'error': f'Error guardando dataset: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        serializer = DatasetDetailSerializer(dataset)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class DatasetViewSet(viewsets.ViewSet):
    """ViewSet para operaciones CRUD de datasets"""
    
    def list(self, request):
        """Listar datasets de sesión"""
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return Response({'error': 'X-Session-ID requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        datasets = Dataset.objects.filter(session_id=session_id)
        serializer = DatasetSerializer(datasets, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Obtener dataset"""
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return Response(
                {'error': 'X-Session-ID requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dataset = get_object_or_404(Dataset, id=pk, session_id=session_id)
            serializer = DatasetDetailSerializer(dataset)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Dataset no encontrado: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """Borrar dataset"""
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return Response(
                {'error': 'X-Session-ID requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dataset = get_object_or_404(Dataset, id=pk, session_id=session_id)
            dataset.file.delete()
            dataset.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'error': f'Error borrando dataset: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )