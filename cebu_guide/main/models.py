from django.db import models

class ChatHistory(models.Model):
    user_session = models.CharField(max_length=64)  # You can use session key or user id
    message = models.TextField()
    sender = models.CharField(max_length=10, choices=[('user', 'User'), ('bot', 'Bot')])
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.sender}: {self.message[:30]}"
