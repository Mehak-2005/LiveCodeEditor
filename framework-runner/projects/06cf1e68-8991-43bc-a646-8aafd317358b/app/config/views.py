
from django.http import JsonResponse
from django.views.decorators.clickjacking import xframe_options_exempt


@xframe_options_exempt
def home(request):
    return JsonResponse({
        "success": True,
        "message": "Django live reload test successful!",
        "framework": "Django",
        "feature": "Live Code Editor"
    })


@xframe_options_exempt
def status(request):
    return JsonResponse({
        "success": True,
        "status": "Application is healthy",
        "framework": "Django"
    })

@xframe_options_exempt
def hello_api(request):
    return JsonResponse({
        "success": True,
        "message": "Hello from my new Django API!",
        "framework": "Django",
        "feature": "Live Code Editor"
    })
