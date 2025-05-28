from django.urls import path
from . import views

urlpatterns = [
    path('', views.FRONT, name='FRONT'),  # <-- Add this line for the homepage
    path('ask-chatbot/', views.ask_chatbot, name='ask_chatbot'),
    path('get-chat-history/', views.get_chat_history, name='get_chat_history'),
    path('clear-chat-history/', views.clear_chat_history, name='clear_chat_history'),
]