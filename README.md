# LUStay – Full Stack Hostel Management System

LUStay is a full-stack web application designed to address off-campus accommodation challenges faced by university students. The system centralizes verified hostel listings, enables secure bookings and payments, and incorporates blockchain-based verification to reduce fraud and improve transparency.

---

## 📁 Project Structure
my-fullstack-app/
│
├── frontend/ # React frontend application
├── backend/ # FastAPI backend API
├── docs/ # Documentation & project reports
├── .gitignore
├── README.md


---

## 🏗 Architecture Overview

- **Frontend:** User interface for students, landlords, and admins  
- **Backend:** REST API handling authentication, bookings, payments, and verification  
- **Blockchain Layer:** Immutable hostel approval and update history  
- **Database:** PostgreSQL  
- **Payments:** M-Pesa integration  

---

## 🚀 Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend
cd frontend
npm install
npm start

🎯 Project Goals

Reduce fake hostel listings and student fraud

Centralize verified accommodation information

Enable secure digital booking & payment

Preserve hostel history using blockchain technology
