from io import BytesIO
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from datasets.models import Dataset
from analysis.models import Analysis
import csv

@api_view(['POST'])
def export_pdf(request):
    dataset_id = request.data.get('dataset_id')
    session_id = request.headers.get('X-Session-ID')

    if not dataset_id or not session_id:
        return Response({'error': 'dataset_id y X-Session-ID requeridos'}, status=400)

    dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
    analysis = Analysis.objects.filter(dataset=dataset).first()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    styles = getSampleStyleSheet()

    elements = []

    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Title'],
        fontSize=20, spaceAfter=12, textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f'Reporte: {dataset.name}', title_style))
    elements.append(Spacer(1, 12))

    # Info del dataset
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'))
    col_count = len(dataset.columns) if isinstance(dataset.columns, list) else 0
    elements.append(Paragraph(f'Filas: {dataset.rows_count} | Columnas: {col_count}', info_style))
    elements.append(Spacer(1, 20))

    if analysis and analysis.data_quality:
        elements.append(Paragraph('Calidad de Datos', styles['Heading2']))
        elements.append(Spacer(1, 8))

        headers = ['Columna', 'Tipo', '% Nulos', 'Únicos']
        rows = [headers]
        for col, info in analysis.data_quality.items():
            rows.append([
                col,
                info.get('dtype', 'N/A'),
                f"{info.get('null_pct', 0):.1f}%",
                str(info.get('unique_count', 0)),
            ])

        table = Table(rows, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 20))

    if analysis and analysis.anomalies:
        elements.append(Paragraph('Anomalías Detectadas', styles['Heading2']))
        elements.append(Spacer(1, 8))
        for anomaly in analysis.anomalies:
            elements.append(Paragraph(f'⚠️ {anomaly.get("message", "")}', styles['Normal']))
        elements.append(Spacer(1, 20))

    if analysis and analysis.statistics:
        elements.append(Paragraph('Estadísticas Descriptivas', styles['Heading2']))
        elements.append(Spacer(1, 8))

        headers = ['Columna', 'Media', 'Mediana', 'Desv Std']
        rows = [headers]
        for col, stats in analysis.statistics.items():
            if stats.get('mean'):
                rows.append([
                    col,
                    f"{stats.get('mean', 0):.2f}",
                    f"{stats.get('median', 0):.2f}",
                    f"{stats.get('std', 0):.2f}",
                ])

        table = Table(rows, colWidths=[1.5*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    from django.http import HttpResponse
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{dataset.name}_reporte.pdf"'
    return response


@api_view(['POST'])
def export_csv(request):
    dataset_id = request.data.get('dataset_id')
    data = request.data.get('data', [])
    session_id = request.headers.get('X-Session-ID')

    if not dataset_id or not session_id:
        return Response({'error': 'dataset_id y X-Session-ID requeridos'}, status=400)

    get_object_or_404(Dataset, id=dataset_id, session_id=session_id)

    buffer = BytesIO()
    writer = csv.writer(buffer)

    if data and len(data) > 0:
        writer.writerow(data[0].keys())
        for row in data:
            writer.writerow(row.values())

    buffer.seek(0)

    from django.http import HttpResponse
    response = HttpResponse(buffer, content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="export_{dataset_id[:8]}.csv"'
    return response
