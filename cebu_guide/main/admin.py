from django.contrib import admin
from .models import ChatHistory

@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user_session', 'sender', 'message')
    list_filter = ('sender', 'timestamp')
    search_fields = ('message', 'user_session')
