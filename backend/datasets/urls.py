from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import DatasetUploadView, DatasetViewSet

# Router para operaciones CRUD estándar
router = SimpleRouter()
router.register(r'', DatasetViewSet, basename='dataset')

urlpatterns = [
    path('upload/', DatasetUploadView.as_view(), name='dataset-upload'),
] + router.urls