from rest_framework import serializers
from .models import TrainedModel

class TrainedModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainedModel
        fields = ['id', 'dataset', 'name', 'model_type', 'target_column', 'features', 
                  'accuracy', 'precision', 'recall', 'f1_score', 'mae', 'created_at']
        read_only_fields = ['id', 'created_at', 'accuracy', 'precision', 'recall', 'f1_score', 'mae']