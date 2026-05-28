from django.urls import path
from . import views

urlpatterns = [
    path('message/', views.send_message, name='send_message'),
    path('history/', views.chat_history, name='chat_history'),
    path('clear/', views.clear_chat, name='clear_chat'),
]
