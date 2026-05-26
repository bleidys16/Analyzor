from rest_framework import serializers
from .models import Analysis, Query

class AnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Analysis
        fields = ['id', 'dataset', 'statistics', 'correlations', 'data_quality', 'anomalies', 'created_at']
        read_only_fields = ['id', 'created_at']

class QuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Query
        fields = ['id', 'dataset', 'sql', 'results', 'execution_time', 'created_at']
        read_only_fields = ['id', 'created_at', 'execution_time']
