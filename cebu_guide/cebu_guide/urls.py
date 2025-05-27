from django.contrib import admin
from django.urls import path
from main import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    
    # Add this new path for the chatbot
    path('ask-chatbot/', views.ask_chatbot, name='ask_chatbot'),
]