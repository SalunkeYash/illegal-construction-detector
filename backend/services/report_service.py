import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_pdf_report(violation, detection, image_path, output_path):
    """
    Generate a complete PDF report for a violation using reportlab.
    Includes header, violation details, location info, detection metadata,
    satellite image evidence, and footer.
    """
    if hasattr(violation, 'to_dict'):
        v = violation.to_dict()
    elif isinstance(violation, dict):
        v = violation
    else:
        v = {}

    if hasattr(detection, 'to_dict'):
        d = detection.to_dict()
    elif isinstance(detection, dict):
        d = detection
    else:
        d = {}

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
    )

    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=2 * mm,
    )

    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=HexColor('#1e3a5f'),
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
        borderWidth=1,
        borderColor=HexColor('#1e3a5f'),
        borderPadding=2,
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=2 * mm,
    )

    elements = []

    # ─── HEADER SECTION ─────────────────────────────────
    header_data = [
        [Paragraph("AI-BASED ILLEGAL CONSTRUCTION DETECTION REPORT", title_style)]
    ]
    header_table = Table(header_data, colWidths=[170 * mm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#1e3a5f')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6 * mm))

    # ─── REPORT METADATA ────────────────────────────────
    report_id = f"RPT-{v.get('id', 0):04d}-{datetime.now().strftime('%Y%m%d')}"
    ref_number = f"JSCOE/CE/ICD/{v.get('id', 0):04d}/{datetime.now().year}"

    meta_data = [
        ['Report ID', report_id],
        ['Generated Date', datetime.now().strftime('%d/%m/%Y, %H:%M')],
        ['Reference Number', ref_number],
    ]
    meta_table = Table(meta_data, colWidths=[50 * mm, 120 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#e8edf2')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 6 * mm))

    # ─── VIOLATION DETAILS ───────────────────────────────
    elements.append(Paragraph("VIOLATION DETAILS", section_style))

    severity = v.get('severity', 'N/A')
    severity_color = '#ef4444' if severity == 'HIGH' else '#f97316' if severity == 'MEDIUM' else '#22c55e'

    violation_data = [
        ['Violation ID', str(v.get('id', 'N/A'))],
        ['Type', v.get('violation_type', 'N/A')],
        ['Severity', severity],
        ['Status', v.get('status', 'N/A')],
        ['Detected At', v.get('detected_at', 'N/A')],
    ]
    violation_table = Table(violation_data, colWidths=[50 * mm, 120 * mm])
    violation_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#e8edf2')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (1, 2), (1, 2), HexColor(severity_color)),
        ('FONTNAME', (1, 2), (1, 2), 'Helvetica-Bold'),
    ]))
    elements.append(violation_table)
    elements.append(Spacer(1, 4 * mm))

    # ─── LOCATION INFORMATION ────────────────────────────
    elements.append(Paragraph("LOCATION INFORMATION", section_style))

    location_data = [
        ['Latitude', f"{v.get('latitude', 0):.6f}"],
        ['Longitude', f"{v.get('longitude', 0):.6f}"],
        ['Area', f"{v.get('area_sqm', 0):.1f} sq m"],
        ['Zone Name', v.get('zone_name', 'N/A')],
        ['Permit Status', v.get('permit_status', 'N/A')],
    ]
    location_table = Table(location_data, colWidths=[50 * mm, 120 * mm])
    location_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#e8edf2')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(location_table)
    elements.append(Spacer(1, 4 * mm))

    # ─── DETECTION METADATA ──────────────────────────────
    elements.append(Paragraph("DETECTION METADATA", section_style))

    confidence = v.get('confidence_score', 0)
    detection_data = [
        ['Confidence Score', f"{confidence:.1%}"],
        ['Detection Method', 'YOLOv8 (Deep Learning)'],
        ['Image Source', 'Satellite / Aerial Imagery'],
        ['Total Objects Detected', str(d.get('total_objects_detected', 'N/A'))],
    ]
    detection_table = Table(detection_data, colWidths=[50 * mm, 120 * mm])
    detection_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#e8edf2')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(detection_table)
    elements.append(Spacer(1, 6 * mm))

    # ─── SATELLITE IMAGE EVIDENCE ────────────────────────
    elements.append(Paragraph("SATELLITE IMAGE EVIDENCE", section_style))

    if image_path and os.path.exists(image_path):
        try:
            img = RLImage(image_path, width=140 * mm, height=105 * mm)
            img.hAlign = 'CENTER'
            elements.append(img)
        except Exception as e:
            elements.append(Paragraph(
                f"[Image could not be loaded: {e}]",
                ParagraphStyle('ImageError', parent=normal_style, alignment=TA_CENTER)
            ))
    else:
        # Placeholder
        placeholder_data = [['Satellite Image Not Available']]
        placeholder_table = Table(placeholder_data, colWidths=[140 * mm], rowHeights=[80 * mm])
        placeholder_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f0f0f0')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TEXTCOLOR', (0, 0), (-1, -1), HexColor('#999999')),
            ('BOX', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
        ]))
        elements.append(placeholder_table)

    elements.append(Spacer(1, 8 * mm))



    # ─── FOOTER ──────────────────────────────────────────
    footer_text = "Generated by AI Construction Detection System | Confidential"
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#999999'),
        alignment=TA_CENTER,
    )
    elements.append(Paragraph(footer_text, footer_style))

    # Build PDF
    try:
        doc.build(elements)
        return output_path
    except Exception as e:
        print(f"[ReportService] Error generating PDF: {e}")
        raise
