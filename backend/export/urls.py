from django.urls import path
from . import views

urlpatterns = [
    path('pdf/', views.export_pdf, name='export-pdf'),
    path('csv/', views.export_csv, name='export-csv'),
]
