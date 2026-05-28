from rest_framework import serializers
from .models import ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'dataset', 'role', 'content', 'sql_generated', 'query_result', 'created_at']
        read_only_fields = ['id', 'created_at', 'sql_generated', 'query_result']