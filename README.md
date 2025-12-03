# 🏥 Hospital Management System (HMS)

## Overview

The Hospital Management System (HMS) is a comprehensive, dual-module platform designed to streamline hospital operations. It consists of two distinct but integrated systems:

1.  **BedManager (Staff System)**: A real-time bed and patient management dashboard for hospital staff (ICU Managers, Nurses, ER Staff).
2.  **IT Admin System**: A centralized employee management and forecasting portal for IT Administrators and Hospital Executives.

This solution ensures efficient resource allocation, real-time communication between departments, and data-driven decision-making for hospital capacity planning.

---

## 🏗️ System Architecture

The project is divided into four main components:

| Component | Directory | Port | Description |
| :--- | :--- | :--- | :--- |
| **Staff Frontend** | `staff-frontend` | `5173` | React-based dashboard for bed/patient management |
| **Staff Backend** | `staff-backend` | `5000` | Node/Express API with Socket.IO for real-time updates |
| **IT Admin Frontend** | `it-admin-frontend` | `5174` | React-based portal for employee management & forecasting |
| **IT Admin Backend** | `it-admin-backend` | `5001` | Node/Express API for user auth and admin functions |

---

## 🎯 Key Features

### 1. BedManager (Staff System)

#### **Real-Time Bed Management**
*   **Live Occupancy Tracking**: Monitor bed status across ICU, ER, and General Wards.
*   **Visual Bed Grid**: Interactive grid showing bed status with color-coded indicators.
*   **Status Types**:
    *   🟢 **Available**: Ready for new patient.
    *   🔴 **Occupied**: Currently in use.
    *   🟠 **Cleaning**: Housekeeping in progress.
    *   🔵 **Reserved**: Booked for incoming patient.
    *   ⚪ **Maintenance**: Out of service.
*   **Instant Updates**: Powered by Socket.IO, changes reflect immediately across all connected devices.

#### **Patient Management**
*   **Admission Workflow**: Streamlined form for admitting patients from ER or direct entry.
*   **Smart Bed Recommendations**: Algorithm suggests optimal beds based on patient priority (Critical, High, Medium, Low) and required equipment (Ventilator, Oxygen, etc.).
*   **Discharge Process**: Automated workflow that transitions bed status to 'Cleaning' upon patient discharge.

#### **Dashboard Analytics**
*   **Operational Metrics**: Real-time counters for total patients, available beds, and pending requests.
*   **Visual Reports**: Charts displaying occupancy trends and ward-wise distribution.
*   **Alerts System**: Notifications for critical occupancy levels (>90%) and new admissions.

### 2. IT Admin System

#### **Employee Management**
*   **User CRUD**: Create, Read, Update, and Delete hospital staff accounts.
*   **Role-Based Access Control (RBAC)**: Assign specific roles to users:
    *   `HOSPITAL_ADMIN`
    *   `ICU_MANAGER`
    *   `ER_STAFF`
    *   `WARD_STAFF`
*   **Status Control**: Activate or deactivate user accounts instantly.

#### **Forecasting & Analytics**
*   **Capacity Planning**: Tools to predict future bed requirements based on historical data.
*   **Staffing Optimization**: Insights to help align staff schedules with peak occupancy times.

---

## 👥 User Roles & Permissions

### Staff System Roles

| Role | Responsibilities | Key Permissions |
| :--- | :--- | :--- |
| **ICU Manager** | Manage ICU operations, critical decisions | ✅ Discharge patients<br>✅ Override bed status<br>✅ View all analytics |
| **ER Staff** | Emergency admissions, triage | ✅ Request beds<br>✅ Admit patients<br>✅ View available beds |
| **Ward Staff** | Daily care, housekeeping updates | ✅ Mark beds 'Cleaning'/'Available'<br>✅ View assigned patients<br>❌ Cannot discharge |
| **Hospital Admin** | High-level oversight | ✅ View all reports<br>✅ Access all wards<br>✅ Generate summaries |

### IT Admin System Roles

| Role | Responsibilities | Key Permissions |
| :--- | :--- | :--- |
| **IT Admin** | System maintenance, user management | ✅ Create/Edit/Delete Employees<br>✅ Reset passwords<br>✅ Manage system config |

---

## 🚀 Setup Instructions

### Prerequisites
*   Node.js (v16+)
*   MongoDB (v5+)
*   npm or yarn

### 1. Database Setup
Ensure your local MongoDB instance is running.
```bash
# Default connection string used in apps:
mongodb://localhost:27017/hospital-system
```

### 2. Staff System Setup

**Backend (`staff-backend`)**
```bash
cd staff-backend
npm install
cp .env.example .env
# Configure .env: PORT=5000, MONGODB_URI=..., JWT_SECRET=...

# Seed initial data (Beds, Wards, Users)
npm run seed

# Start server
npm run dev
```

**Frontend (`staff-frontend`)**
```bash
cd staff-frontend
npm install
# Start development server
npm run dev
# Access at http://localhost:5173
```

### 3. IT Admin System Setup

**Backend (`it-admin-backend`)**
```bash
cd it-admin-backend
npm install
cp .env.example .env
# Configure .env: PORT=5001, MONGODB_URI=..., JWT_SECRET=...
# Set Admin Credentials in .env:
# ADMIN_EMAIL=admin@hospital.com
# ADMIN_PASSWORD=secure_password

# Start server
npm run dev
```

**Frontend (`it-admin-frontend`)**
```bash
cd it-admin-frontend
npm install
# Start development server
npm run dev
# Access at http://localhost:5174
```

---

## 🔐 Default Credentials (Seeded Data)

### Staff System
| Role | Email | Password |
| :--- | :--- | :--- |
| **ICU Manager** | `anuradha@hospital.com` | `password123` |
| **Nurse** | `nurse@hospital.com` | `password123` |
| **Doctor** | `doctor@hospital.com` | `password123` |
| **ER Staff** | `er@hospital.com` | `password123` |

### IT Admin System
| Role | Email | Password |
| :--- | :--- | :--- |
| **IT Admin** | *(Check .env file)* | *(Check .env file)* |

---

## 🔌 API Documentation

### Staff Backend API (`http://localhost:5000`)

#### **Auth**
*   `POST /api/auth/login`: Authenticate staff user.
*   `GET /api/auth/me`: Get current user profile.

#### **Beds**
*   `GET /api/beds`: List all beds (filters: ward, status).
*   `POST /api/beds/recommend`: Get bed recommendations for patient.
*   `PATCH /api/beds/:id`: Update bed status (e.g., to 'Maintenance').

#### **Patients**
*   `POST /api/patients`: Admit a new patient.
*   `POST /api/patients/:id/discharge`: Discharge a patient.
*   `GET /api/patients`: List all active patients.

### IT Admin Backend API (`http://localhost:5001`)

#### **Auth**
*   `POST /api/auth/login`: Admin login.

#### **Users (Employees)**
*   `GET /api/users`: List all hospital staff.
*   `POST /api/users`: Create a new staff account.
*   `PATCH /api/users/:id`: Update staff details/roles.
*   `DELETE /api/users/:id`: Remove a staff account.

---

## 🛠️ Technology Stack

### Frontend
*   **Framework**: React 18 (Vite)
*   **Styling**: Tailwind CSS, Lucide React (Icons)
*   **State/Data**: Axios, React Context API
*   **Real-time**: Socket.IO Client
*   **Visualization**: Recharts

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Real-time**: Socket.IO
*   **Security**: JWT Auth, BCrypt, CORS, Cookie Parser

---

## 👨‍💻 Development Team

*   **Sai Anirudh Karre** - *Lead Developer*
*   **Team Size**: 5 Members

---

## 📄 License

This project is proprietary software developed for hospital management purposes.
