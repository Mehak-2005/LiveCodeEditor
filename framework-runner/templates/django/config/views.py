
from django.http import JsonResponse
from django.views.decorators.clickjacking import xframe_options_exempt


@xframe_options_exempt
def home(request):
    return JsonResponse({
        "success": True,
        "message": "Django edit-save-run test successful!",
        "framework": "Django",
        "feature": "Live Code Editor"
    })
