from django.db import models
from datasets.models import Dataset

class Analysis(models.Model):
    dataset = models.OneToOneField(Dataset, on_delete=models.CASCADE, related_name='analysis')
    
    # Estadísticas por columna
    statistics = models.JSONField(default=dict)  # {column: {mean, median, std, min, max, null_count}}
    
    # Correlaciones
    correlations = models.JSONField(default=dict)  # matriz de correlaciones
    
    # Análisis de tipos
    data_quality = models.JSONField(default=dict)  # {column: {null_pct, unique_count, dtype}}
    
    # Anomalías detectadas
    anomalies = models.JSONField(default=list)  # lista de anomalías
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analysis: {self.dataset.name}"


class Query(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='queries')
    sql = models.TextField()
    results = models.JSONField()
    execution_time = models.FloatField()  # en ms
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Query: {self.dataset.name}"
