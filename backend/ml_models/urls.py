from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import MLModelViewSet

router = SimpleRouter()
router.register(r'', MLModelViewSet, basename='model')

urlpatterns = router.urls