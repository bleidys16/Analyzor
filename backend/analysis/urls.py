from django.urls import path
from .views import AutoAnalyzeAPIView, AnalysisDetailAPIView, QueryAPIView, ColumnDistributionsAPIView, AnalysisSummaryAPIView

urlpatterns = [
    path('auto-analyze/', AutoAnalyzeAPIView.as_view(), name='auto-analyze'),
    path('<uuid:pk>/', AnalysisDetailAPIView.as_view(), name='analysis-detail'),
    path('<uuid:pk>/summary/', AnalysisSummaryAPIView.as_view(), name='analysis-summary'),
    path('query/', QueryAPIView.as_view(), name='execute-query'),
    path('distributions/', ColumnDistributionsAPIView.as_view(), name='column-distributions'),
]
