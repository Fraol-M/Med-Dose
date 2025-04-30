from django.db import models
from django.contrib.auth.models import User

class Medicine(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('twice', 'Twice a day'),
        ('thrice', 'Thrice a day'),
        ('weekly', 'Weekly'),
    ]
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    
    duration_value = models.PositiveIntegerField()
    
    DURATION_TYPE_CHOICES = [
        ('days', 'Days'),
        ('months', 'Months'),
    ]
    duration_type = models.CharField(max_length=20, choices=DURATION_TYPE_CHOICES, default='days')
    
    start_date = models.DateField()

    def __str__(self):
        return f"{self.name} for {self.user.username}"