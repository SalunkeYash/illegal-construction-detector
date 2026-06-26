# AI-Based Detection of Illegal Construction in Cities

Final Year BE Computer Engineering Project - JSPM's JSCOE, Pune (SPPU)
Academic Year 2025-26

**Team:** Yash Salunke, Tanmay Bhujbal, Pragati Jagtap, Harshawardhan Chavan
**Guide:** Prof. Mohini Thorat

This project is a complete, production-ready full-stack web application designed to automatically detect illegal construction using satellite imagery, YOLOv8 object detection, and GIS cadastral mapping.

## Technology Stack
- **Backend:** Python 3.11, Flask, YOLOv8, OpenCV, SQLite, SQLAlchemy, Shapely, PyJWT, ReportLab
- **Frontend:** React 18, Tailwind CSS, React-Leaflet, Recharts, React-Router

## Features
- **YOLOv8 Detection:** Identifies buildings and structures from satellite images (with a graceful mock-mode fallback if YOLO is unavailable).
- **GIS Integration:** Cross-references detections with GeoJSON zoning boundaries to classify violations (e.g., Green Zone Extension, Height Violation).
- **Automated Reporting:** Generates downloadable, styled PDF legal reports using ReportLab.
- **Interactive Dashboards:** Real-time metrics, interactive maps, and alert management.
- **JWT Authentication:** Secure login for Authority, Admin, and Citizen roles.

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
python seed.py
python app.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run start
```

### Demo Credentials
- **Admin:** `admin` / `Admin@123`

