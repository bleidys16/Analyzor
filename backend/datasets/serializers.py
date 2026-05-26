from rest_framework import serializers
from .models import Dataset, DatasetPreview

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ['id', 'session_id', 'name', 'columns', 'rows_count', 'file_size', 'dtypes', 'created_at']
        read_only_fields = ['id', 'created_at', 'rows_count', 'file_size', 'columns', 'dtypes']

class DatasetDetailSerializer(serializers.ModelSerializer):
    preview = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = ['id', 'session_id', 'name', 'columns', 'rows_count', 'file_size', 'dtypes', 'created_at', 'preview']
        read_only_fields = ['id', 'created_at', 'rows_count', 'file_size', 'columns', 'dtypes']

    def get_preview(self, obj):
        if hasattr(obj, 'preview'):
            return obj.preview.data[:10]  # Solo primeras 10 filas
        return None