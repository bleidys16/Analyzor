from django.db import models
from datasets.models import Dataset

class TrainedModel(models.Model):
    MODEL_TYPES = [
        ('linear_regression', 'Regresión Lineal'),
        ('random_forest', 'Random Forest'),
        ('knn', 'K-Nearest Neighbors'),
        ('logistic_regression', 'Regresión Logística'),
    ]
    
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=255)
    model_type = models.CharField(max_length=50, choices=MODEL_TYPES)
    target_column = models.CharField(max_length=255)
    features = models.JSONField(default=list)
    
    # Métricas
    accuracy = models.FloatField(null=True, blank=True)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    mae = models.FloatField(null=True, blank=True)  # Para regresión
    
    model_file = models.FileField(upload_to='models/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.model_type}"