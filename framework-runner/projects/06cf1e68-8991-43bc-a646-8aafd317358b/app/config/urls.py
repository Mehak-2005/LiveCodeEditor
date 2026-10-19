
from django.contrib import admin
from django.urls import path
from .views import home, status, hello_api

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/status", status, name="status"),
    path("api/hello", hello_api, name="hello_api"),
]
