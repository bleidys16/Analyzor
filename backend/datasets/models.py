from django.db import models
import uuid

class Dataset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='datasets/')
    csv_content = models.TextField(null=True, blank=True, default='')
    columns = models.JSONField(default=list)
    rows_count = models.IntegerField()
    file_size = models.IntegerField()
    dtypes = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class DatasetPreview(models.Model):
    dataset = models.OneToOneField(Dataset, on_delete=models.CASCADE, related_name='preview')
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Preview: {self.dataset.name}"