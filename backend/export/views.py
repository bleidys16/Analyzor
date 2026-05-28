from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image,
    PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.platypus.tableofcontents import TableOfContents
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from datasets.models import Dataset
from analysis.models import Analysis
from analysis.utils import generate_analysis_summary
import csv

# ─── Colores corporativos ───
C_PRIMARY = colors.HexColor('#111827')
C_ACCENT = colors.HexColor('#6366f1')
C_MUTED = colors.HexColor('#6b7280')
C_BG_HEADER = colors.HexColor('#1e293b')
C_BORDER = colors.HexColor('#e5e7eb')
C_WHITE = colors.white
C_SUCCESS = colors.HexColor('#10b981')
C_DANGER = colors.HexColor('#ef4444')
C_WARNING = colors.HexColor('#f59e0b')
C_ROW_ALT = colors.HexColor('#f9fafb')

# ─── Estilos ───
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontSize=26, leading=32, spaceAfter=10,
    textColor=C_PRIMARY, alignment=TA_CENTER,
    fontName='Helvetica-Bold',
)
subtitle_style = ParagraphStyle(
    'Subtitle', parent=styles['Normal'],
    fontSize=9, leading=12, textColor=C_MUTED, alignment=TA_CENTER,
    spaceAfter=20,
)
section_style = ParagraphStyle(
    'Section', parent=styles['Heading2'],
    fontSize=15, leading=18, textColor=C_ACCENT,
    spaceBefore=20, spaceAfter=10,
    fontName='Helvetica-Bold',
)
body_style = ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=C_PRIMARY,
)
small_style = ParagraphStyle(
    'Small', parent=styles['Normal'],
    fontSize=8, leading=10, textColor=C_MUTED,
)
kpi_value_style = ParagraphStyle(
    'KPIValue', parent=styles['Normal'],
    fontSize=20, leading=24, textColor=C_ACCENT,
    alignment=TA_CENTER, fontName='Helvetica-Bold',
)
kpi_label_style = ParagraphStyle(
    'KPILabel', parent=styles['Normal'],
    fontSize=7, leading=9, textColor=C_MUTED,
    alignment=TA_CENTER,
)
anomaly_style = ParagraphStyle(
    'Anomaly', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=colors.HexColor('#991b1b'),
    leftIndent=12,
)

# ─── Tabla base (PRO) ───
BASE_TABLE_STYLE = TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), C_BG_HEADER),
    ('TEXTCOLOR', (0, 0), (-1, 0), C_WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [C_WHITE, C_ROW_ALT]),
    ('LINEBELOW', (0, 0), (-1, 0), 1, C_BORDER),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
])


# ─── Helper: tarjeta con borde y acento ───
def wrap_card(content, col_width=160*mm):
    block = [[content]]
    tbl = Table(block, colWidths=[col_width])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBEFORE', (0, 0), (0, -1), 3, C_ACCENT),
    ]))
    return tbl


def build_kpi_table(dataset, analysis):
    """KPIs en fila"""
    col_count = len(dataset.columns) if isinstance(dataset.columns, list) else 0
    numeric_count = 0
    if dataset.dtypes:
        numeric_count = sum(
            1 for v in dataset.dtypes.values()
            if any(k in str(v).lower() for k in ['int', 'float', 'double', 'decimal'])
        )

    kpis = [
        (str(dataset.rows_count or 0), 'Filas'),
        (str(col_count), 'Columnas'),
        (str(numeric_count), 'Numéricas'),
        (str(col_count - numeric_count), 'Categóricas'),
        (f"{(dataset.file_size or 0) / 1024:.1f} KB", 'Tamaño'),
    ]

    data = []
    for val, label in kpis:
        data.append([
            Paragraph(f'<b>{val}</b>', kpi_value_style),
            Paragraph(label, kpi_label_style),
        ])

    tbl = Table(data, colWidths=[34*mm, 34*mm])
    tbl.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), C_WHITE),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [C_WHITE, C_ROW_ALT]),
    ]))
    return tbl


def build_quality_table(analysis):
    """Tabla de calidad de datos"""
    if not analysis or not analysis.data_quality:
        return None
    headers = ['Columna', 'Tipo', 'No Nulos', '% Nulos', 'Únicos']
    data = [headers]
    for col, info in analysis.data_quality.items():
        null_pct = info.get('null_pct', 0)
        color = '#ef4444' if null_pct > 20 else '#10b981'
        data.append([
            Paragraph(f'<b>{col}</b>', body_style),
            info.get('dtype', '—'),
            str(info.get('null_count', 0)),
            Paragraph(f'<font color="{color}">{null_pct:.1f}%</font>', body_style),
            str(info.get('unique_count', 0)),
        ])

    tbl = Table(data, colWidths=[38*mm, 25*mm, 20*mm, 20*mm, 20*mm])
    tbl.setStyle(BASE_TABLE_STYLE)
    return tbl


def build_stats_table(analysis):
    """Tabla de estadísticas descriptivas (solo numéricas)"""
    if not analysis or not analysis.statistics:
        return None
    headers = ['Columna', 'Media', 'Mediana', 'Std', 'Mín', 'Máx', 'Q25', 'Q75']
    data = [headers]
    for col, s in analysis.statistics.items():
        if s.get('mean') is None:
            continue
        data.append([
            Paragraph(f'<b>{col}</b>', body_style),
            f"{s.get('mean', 0):.2f}",
            f"{s.get('median', 0):.2f}",
            f"{s.get('std', 0):.2f}",
            f"{s.get('min', 0):.2f}",
            f"{s.get('max', 0):.2f}",
            f"{s.get('q25', 0):.2f}",
            f"{s.get('q75', 0):.2f}",
        ])

    tbl = Table(data, colWidths=[28*mm, 16*mm, 16*mm, 14*mm, 14*mm, 14*mm, 14*mm, 14*mm])
    tbl.setStyle(BASE_TABLE_STYLE)
    return tbl


def build_categorical_summary(analysis):
    """Resumen de columnas categóricas como tarjetas"""
    if not analysis or not analysis.statistics:
        return []

    elements = []

    total = analysis.dataset.rows_count if hasattr(analysis, 'dataset') else 1

    for col, s in analysis.statistics.items():
        if s.get('mean') is not None:
            continue

        unique = s.get('unique', 0)
        most_common = s.get('most_common', '—')
        cardinality = (unique / total) * 100 if total else 0

        block = [
            [Paragraph(f'<b>{col}</b>', body_style)],
            [Paragraph(f'{unique} valores únicos · Más común: {most_common}', body_style)],
            [Paragraph(f'<font color="#6b7280">Cardinalidad: {cardinality:.1f}%</font>', small_style)],
        ]

        tbl = Table(block, colWidths=[160*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBEFORE', (0, 0), (0, -1), 3, C_ACCENT),
        ]))

        elements.append(tbl)
        elements.append(Spacer(1, 6))

    return elements


def build_anomalies_section(analysis):
    """Lista de anomalías (sin título)"""
    if not analysis or not analysis.anomalies:
        return None
    inner = []
    for anomaly in analysis.anomalies:
        inner.append(Paragraph(
            f'• {anomaly.get("message", "")}',
            anomaly_style
        ))
    inner.append(Spacer(1, 4))
    tbl = Table([[item] for item in inner], colWidths=[160*mm])
    tbl.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return tbl


def build_preview_table(dataset):
    """Vista previa de datos"""
    if not hasattr(dataset, 'preview') or not dataset.preview:
        return None
    preview_data = dataset.preview.data
    if not preview_data:
        return None
    preview_data = preview_data[:10]

    columns = dataset.columns if isinstance(dataset.columns, list) else []
    if not columns or not preview_data:
        return None

    headers = columns[:8]  # máx 8 columnas
    data = [headers]
    for row in preview_data:
        data.append([
            str(row.get(h, ''))[:20] for h in headers
        ])

    tbl = Table(data, colWidths=[22*mm] * len(headers))
    tbl.setStyle(BASE_TABLE_STYLE)
    return tbl


def header_footer(canvas, doc):
    """Header y footer con página"""
    canvas.saveState()
    # Header
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(C_MUTED)
    canvas.drawString(20*mm, A4[1] - 12*mm, 'Reporte Analítico de Datos')
    canvas.drawRightString(A4[0] - 20*mm, A4[1] - 12*mm, datetime.now().strftime('%d/%m/%Y %H:%M'))
    canvas.setStrokeColor(C_ACCENT)
    canvas.setLineWidth(1)
    canvas.line(20*mm, A4[1] - 14*mm, A4[0] - 20*mm, A4[1] - 14*mm)
    # Footer
    canvas.drawString(20*mm, 12*mm, f'Generado el {datetime.now().strftime("%d/%m/%Y %H:%M")}')
    canvas.drawRightString(A4[0] - 20*mm, 12*mm, f'Página {doc.page}')
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 16*mm, A4[0] - 20*mm, 16*mm)
    canvas.restoreState()


@api_view(['POST'])
def export_pdf(request):
    dataset_id = request.data.get('dataset_id')
    session_id = request.headers.get('X-Session-ID')

    if not dataset_id or not session_id:
        return Response({'error': 'dataset_id y X-Session-ID requeridos'}, status=400)

    dataset = get_object_or_404(Dataset, id=dataset_id, session_id=session_id)
    analysis = Analysis.objects.filter(dataset=dataset).first()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=22*mm, bottomMargin=22*mm,
        leftMargin=20*mm, rightMargin=20*mm,
    )

    elements = []

    # ─── Portada ───
    elements.append(Spacer(1, 30*mm))
    elements.append(HRFlowable(width='60%', thickness=3, color=C_ACCENT, spaceAfter=10, spaceBefore=0))
    elements.append(Paragraph('REPORTE DE DATOS', ParagraphStyle(
        'CoverLabel', fontSize=11, leading=14, textColor=C_MUTED, alignment=TA_CENTER,
        fontName='Helvetica-Bold', spaceAfter=6,
    )))
    elements.append(Paragraph(f'{dataset.name}', title_style))
    elements.append(Paragraph(
        f'Generado el {datetime.now().strftime("%d de %B del %Y a las %H:%M")}',
        subtitle_style
    ))
    elements.append(Spacer(1, 12*mm))

    # ─── KPIs ───
    elements.append(build_kpi_table(dataset, analysis))
    elements.append(Spacer(1, 10*mm))

    # Línea separadora
    elements.append(HRFlowable(
        width='100%', thickness=0.5, color=C_BORDER,
        spaceAfter=8*mm, spaceBefore=4*mm,
    ))

    # ─── Calidad de Datos ───
    elements.append(Paragraph('Calidad de Datos', section_style))
    elements.append(HRFlowable(width='100%', thickness=1, color=C_BORDER, spaceAfter=4))
    quality_tbl = build_quality_table(analysis)
    if quality_tbl:
        elements.append(wrap_card(quality_tbl))
    else:
        elements.append(Paragraph('Sin datos de calidad disponibles.', body_style))
    elements.append(Spacer(1, 8*mm))

    # ─── Anomalías ───
    anomalies_tbl = build_anomalies_section(analysis)
    if anomalies_tbl:
        elements.append(Paragraph('Anomalias Detectadas', section_style))
        elements.append(HRFlowable(width='100%', thickness=1, color=C_BORDER, spaceAfter=4))
        elements.append(wrap_card(anomalies_tbl))
        elements.append(Spacer(1, 8*mm))

    # ─── Estadísticas Descriptivas ───
    elements.append(Paragraph('Estadisticas Descriptivas', section_style))
    elements.append(HRFlowable(width='100%', thickness=1, color=C_BORDER, spaceAfter=4))
    stats_tbl = build_stats_table(analysis)
    if stats_tbl:
        elements.append(wrap_card(stats_tbl))
    else:
        elements.append(Paragraph('No hay columnas numéricas con estadísticas.', body_style))
    elements.append(Spacer(1, 8*mm))

    # ─── Resumen de Categóricas ───
    cat_elements = build_categorical_summary(analysis)
    if cat_elements:
        elements.append(Paragraph('Distribucion de Categoricas', section_style))
        elements.append(HRFlowable(width='100%', thickness=1, color=C_BORDER, spaceAfter=4))
        elements.extend(cat_elements)
        elements.append(Spacer(1, 8*mm))

    # ─── Vista Previa ───
    preview_tbl = build_preview_table(dataset)
    if preview_tbl:
        elements.append(PageBreak())
        elements.append(Paragraph('Vista Previa de Datos', section_style))
        elements.append(HRFlowable(width='100%', thickness=1, color=C_BORDER, spaceAfter=4))
        elements.append(wrap_card(preview_tbl))

    # ─── Footer info ───
    elements.append(Spacer(1, 12*mm))
    elements.append(HRFlowable(
        width='100%', thickness=0.5, color=C_BORDER,
        spaceAfter=4*mm, spaceBefore=8*mm,
    ))
    elements.append(Paragraph(
        f'Este reporte fue generado automáticamente por <b>Analyzor</b> '
        f'con {dataset.rows_count or 0} registros y '
        f'{len(dataset.columns) if isinstance(dataset.columns, list) else 0} columnas.',
        small_style
    ))

    doc.build(elements, onFirstPage=header_footer, onLaterPages=header_footer)
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
