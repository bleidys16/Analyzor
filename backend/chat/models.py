from django.db import models

from datasets.models import Dataset


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    sql_generated = models.TextField(blank=True, null=True)
    query_result = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )

    class Meta:
        ordering = ['created_at']
