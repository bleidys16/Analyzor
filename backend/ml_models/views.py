from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from datasets.models import Dataset
from .models import TrainedModel
from .serializers import TrainedModelSerializer
from .trainer import MLTrainer

@method_decorator(csrf_exempt, name='dispatch')
class MLModelViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['post'])
    def train(self, request):
        """Entrena un modelo ML"""
        session_id = request.headers.get('X-Session-ID')
        dataset_id = request.data.get('dataset_id')
        target_column = request.data.get('target_column')
        model_type = request.data.get('model_type', 'random_forest')
        
        if not session_id or not dataset_id or not target_column:
            return Response(
                {'error': 'dataset_id, target_column y X-Session-ID requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
            
            # Entrenar
            trainer = MLTrainer(dataset.file.path)
            result = trainer.train(target_column, model_type)
            
            # Guardar modelo
            model = TrainedModel.objects.create(
                dataset=dataset,
                name=f"{model_type.replace('_', ' ').title()} - {target_column}",
                model_type=model_type,
                target_column=target_column,
                features=result['features'],
                accuracy=result['metrics']['accuracy'],
                precision=result['metrics']['precision'],
                recall=result['metrics']['recall'],
                f1_score=result['metrics']['f1_score'],
                mae=result['metrics']['mae'],
            )
            
            serializer = TrainedModelSerializer(model)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request):
        """Listar modelos"""
        session_id = request.headers.get('X-Session-ID')
        dataset_id = request.query_params.get('dataset_id')
        
        if not session_id or not dataset_id:
            return Response(
                {'error': 'dataset_id y X-Session-ID requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
            models = TrainedModel.objects.filter(dataset=dataset)
            serializer = TrainedModelSerializer(models, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)