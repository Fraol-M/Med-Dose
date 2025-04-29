from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .form import RegisterForm
from .models import Medicine
import json

@login_required
def dashboard(request):
    medicines = Medicine.objects.filter(user=request.user)
    return render(request, 'index.html', {'medicines': medicines})

def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
                username=form.cleaned_data["username"],
                password=form.cleaned_data["password"],
                email=form.cleaned_data["email"]
            )
            login(request, user)
            return redirect('index')
    else:
        form = RegisterForm()

    return render(request, "signup/register.html", {"form": form})

def login_view(request):
    if request.method == "POST":
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user:
            login(request, user)
            next_url = request.POST.get('next') or request.GET.get('next') or 'index'
            return redirect(next_url)
        else:
            return render(request, "signup/login.html", {"error": "Invalid credentials"})

    return render(request, "signup/login.html")

def logout_view(request):
    logout(request)
    return redirect('login')


@csrf_exempt
def add_medicine(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            medicine = Medicine.objects.create(
                user=request.user,  # assuming user is logged in
                name=data['name'],
                dosage=data['dosage'],
                frequency=data['frequency'],
                duration_value=data['duration_value'],
                duration_type=data['duration_type'],
                start_date=data['start_date']
            )
            return JsonResponse({'message': 'Medicine created successfully!'}, status=201)

        except Exception as e:
            print(e)
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)



@login_required
def get_medicines(request):
    if request.user.is_authenticated:
        medicines = Medicine.objects.filter(user=request.user)
        medicines_data = [
            {
                'id': med.id,
                'name': med.name,
                'dosage': med.dosage,
                'frequency': med.frequency,
                'durationValue': med.duration_value,
                'durationType': med.duration_type,
                'startDate': med.start_date.isoformat(),  # important for JS
                'taken': False,  # or you can later make it based on another field
            }
            for med in medicines
        ]
        return JsonResponse({'medicines': medicines_data})
    else:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
