from django.urls import path
from .views import dashboard, login_view, register_view, logout_view, add_medicine, get_medicines

urlpatterns = [
    path("", register_view, name='register_view'),
    path("login/", login_view, name="login"),
    path("index/", dashboard, name="index"),
    path("logout/", logout_view, name = 'logout'),
    path('add_medicine/', add_medicine, name='add_medicine'),
    path('get_medicines/', get_medicines, name='get_medicines'),
    
]
