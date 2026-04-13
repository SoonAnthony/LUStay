# LUStay – Secure Off-Campus Hostel Management Platform

LUStay is a production-oriented full-stack web platform designed to eliminate fraud and improve transparency in off-campus student accommodation. The system centralizes verified hostel listings, enables secure digital bookings and M-Pesa payments, and integrates blockchain-based verification to ensure immutable hostel records.

Built with scalability, modularity, and security in mind, LUStay demonstrates modern backend architecture, role-based access control, and real-world fintech integration.

---

## 🏗 System Architecture

my-fullstack-app/
│
├── frontend/ # React-based client application
├── backend/ # FastAPI REST API (modular architecture)
├── docs/ # Technical documentation & diagrams
├── .gitignore
├── README.md



### Architecture Highlights

- **Modular FastAPI backend**
- **JWT-based authentication**
- **Role-based access control (RBAC)**
- **Blockchain-backed hostel verification**
- **M-Pesa payment workflow**
- **PostgreSQL database**
- **Cloud media storage**
- **Google Maps geolocation integration**

---

## 🔐 Blockchain-Backed Verification

To combat fraudulent listings:

- Approved hostels are recorded as immutable blockchain entries.
- Any modification (price updates, renovations, feature changes) creates a new block.
- Historical records remain tamper-proof and auditable.

This ensures transparency, traceability, and student trust.

---

## 🚀 Key Features

### Students
- Browse verified hostels with real-time availability
- View location and distance from campus
- Secure online booking & M-Pesa payments
- Submit ratings and reviews

### Landlords
- Manage listings and availability
- Track bookings and payment confirmations

### Admin
- Verify hostels before publication
- Monitor activity and generate reports
- Enforce security and compliance policies

---

## ⚙️ Tech Stack

- **Frontend:** React
- **Backend:** FastAPI
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Payments:** M-Pesa API
- **Blockchain:** Immutable hostel record layer
- **Deployment:** Docker-ready

---

## 🧪 Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
fastapi dev app/
```

### Frontend

- cd frontend
- cd client
- npm install
- npm run dev

🎯 Impact

LUStay addresses real-world accommodation fraud affecting university students by combining secure software architecture, fintech integration, and blockchain-backed verification into one unified platform.
