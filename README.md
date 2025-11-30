# 🏥 BedManager - Hospital Bed & ICU Occupancy Management System

## Overview

BedManager is a real-time hospital bed and ICU occupancy dashboard designed for large city hospitals. It enables hospital administrators, ICU managers, and ward staff to monitor occupancy across wards, track bed availability in real-time, manage patient transfers, and forecast capacity needs.

---

## 🎯 Key Features

### Real-Time Bed Management
- **Live Occupancy Tracking**: Monitor bed status across ICU, ER, and General Wards
- **Visual Bed Grid**: 10-column grid layout showing 75 beds (15 ICU, 20 ER, 40 General Ward)
- **Color-Coded Status**: Green (Available), Light Red (Occupied), Orange (Cleaning), Blue (Reserved), Gray (Maintenance)
- **Instant Updates**: Socket.IO for real-time bed status changes

### Patient Management
- **Quick Admission**: Add patients with auto-generated 5-character IDs
- **Bed Assignment**: Assign patients to specific beds with ward selection
- **Bed Recommendations**: System suggests optimal beds based on priority and equipment
- **Discharge Flow**: Automatic bed status update to 'cleaning' upon discharge

### Dashboard Analytics
- **Occupancy Metrics**: Total patients, pending requests, unread alerts
- **Ward Statistics**: Real-time counts of occupied/available/cleaning/reserved beds
- **Visual Charts**: Bar charts for occupancy trends, pie charts for bed distribution
- **Upcoming Discharges**: View patients scheduled for discharge in next 24 hours

---

## 👥 User Roles & Permissions

### ICU Manager (e.g., Anuradha)
**Responsibilities:**
- Monitor ICU occupancy in real-time
- Allocate beds to critical patients
- Approve bed requests from ER
- Review capacity forecasts

**Permissions:**
- ✅ View all beds and patients
- ✅ Assign patients to beds
- ✅ Discharge patients
- ✅ Update bed status
- ✅ View dashboard analytics

### Ward/Unit Staff
**Responsibilities:**
- Update bed statuses after cleaning
- Mark beds as maintenance when needed
- Report bed availability

**Permissions:**
- ✅ View beds in their ward
- ✅ Update bed status (available, cleaning, maintenance)
- ✅ View assigned patients
- ❌ Discharge patients (requires manager approval)

### ER Staff
**Responsibilities:**
- Request beds for emergency admissions
- View available beds across all wards
- Admit patients to available beds

**Permissions:**
- ✅ View all available beds
- ✅ Create bed requests
- ✅ Admit emergency patients
- ✅ View ER bed status

### Hospital Administration
**Responsibilities:**
- Review utilization reports
- Plan capacity based on trends
- Monitor overall hospital occupancy

**Permissions:**
- ✅ View all dashboard analytics
- ✅ Generate reports
- ✅ View historical data
- ✅ Access all wards

### Medical Staff (Doctors/Nurses)
**Responsibilities:**
- View patient bed assignments
- Request bed transfers
- Update patient information

**Permissions:**
- ✅ View patients and bed assignments
- ✅ Update patient status
- ❌ Update bed status directly

---

## 🗄️ Database Structure

### Ward Model
```javascript
{
  name: String (e.g., "ICU"),
  type: String (enum: ['ICU', 'ER', 'General Ward']),
  capacity: Number (15, 20, or 40),
  floor: Number,
  equipment: [String]
}
```

### Bed Model
```javascript
{
  bedNumber: String (e.g., "ICU-001"),
  ward: ObjectId (ref: 'Ward'),
  floor: Number,
  status: String (enum: ['available', 'occupied', 'cleaning', 'reserved', 'maintenance']),
  equipmentType: [String],
  currentPatient: ObjectId (ref: 'Patient'),
  estimatedAvailableTime: Date,
  lastUpdated: Date
}
```

### Patient Model
```javascript
{
  patientId: String (auto-generated 5-char alphanumeric),
  name: String,
  age: Number,
  gender: String,
  department: String,
  reasonForAdmission: String,
  priority: String (enum: ['low', 'medium', 'high', 'critical']),
  status: String (enum: ['admitted', 'discharged', 'transferred']),
  assignedBed: ObjectId (ref: 'Bed'),
  admittedAt: Date,
  dischargedAt: Date
}
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Backend Setup (staff-backend)
```bash
cd staff-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add:
# MONGODB_URI=mongodb://localhost:27017/hospital-system
# JWT_SECRET=your_jwt_secret_here
# PORT=5000

# Seed the database
node seeders/seedData.js

# Start the server
npm run dev
```

### Frontend Setup (staff-frontend)
```bash
cd staff-frontend

# Install dependencies
npm install

# Create .env file (if needed)
# VITE_API_URL=http://localhost:5000

# Start the development server
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 🔐 Login Credentials (Seeded Data)

| Name | Email | Password | Role |
|------|-------|----------|------|
| Anuradha Manager | anuradha@hospital.com | password123 | ICU_MANAGER |
| John Nurse | nurse@hospital.com | password123 | Nurse |
| Dr. Smith | doctor@hospital.com | password123 | Doctor |
| ER Staff | er@hospital.com | password123 | ER_STAFF |

---

##  📊 System Workflows

### Workflow 1: Admitting a Patient

1. **ER Staff logs in** → Navigates to Dashboard
2. **Clicks on available bed** (green) in appropriate ward
3. **Clicks "Assign Patient to This Bed"**
4. **Fills patient form:**
   - Name, Age, Gender
   - Reason for admission
   - Priority level
   - Ward type (auto-filled based on bed)
   - Bed number (auto-filled)
5. **Submits form**
6. **System automatically:**
   - Creates patient with unique ID
   - Updates bed status to 'occupied'
   - Links patient to bed
   - Broadcasts real-time update to all connected users

### Workflow 2: Discharging a Patient

1. **ICU Manager logs in** → Navigates to Beds page
2. **Clicks on occupied bed** (light red)
3. **Views patient information** in modal
4. **Clicks "Discharge Patient"**
5. **Confirms discharge**
6. **System automatically:**
   - Updates patient status to 'discharged'
   - Sets bed status to 'cleaning'
   - Clears currentPatient from bed
   - Broadcasts update

### Workflow 3: Updating Bed Status

1. **Ward Staff logs in** → Navigates to Beds page
2. **Clicks on bed** needing status update
3. **Uses "Update Bed Status" dropdown:**
   - Available (after cleaning complete)
   - Cleaning (after discharge)
   - Maintenance (if equipment issues)
   - Reserved (for expected admission)
4. **System updates status** and broadcasts to all users

### Workflow 4: Emergency Admission

1. **ER receives critical patient**
2. **ER Staff checks Dashboard** for available ICU beds
3. **System shows:** "ICU: 2 available, 13 occupied"
4. **ER Staff clicks available ICU bed**
5. **Fills emergency admission form** with critical priority
6. **Bed immediately assigned** and visible to ICU Manager

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login staff user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Beds
- `GET /api/beds` - Get all beds (supports filters: ward, status)
- `GET /api/beds/available` - Get available beds
- `POST /api/beds/recommend` - Get recommended beds
- `PATCH /api/beds/:id` - Update bed status

### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Admit new patient
- `POST /api/patients/:id/discharge` - Discharge patient

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard statistics
- `GET /api/dashboard/summary` - Get plain-English ward summaries

### Alerts
- `GET /api/alerts` - Get alerts (supports filter: isRead)
- `PATCH /api/alerts/:id/read` - Mark alert as read

---

## 🔄 Real-Time Events (Socket.IO)

### Events Emitted by Server
- `bed:updated` - When bed status changes
- `patient:admitted` - When new patient admitted
- `patient:discharged` - When patient discharged
- `alert:created` - When new alert created
- `alert:occupancy` - Critical occupancy alert (>90%)

### Client Listeners
Frontend automatically refreshes data when receiving these events

---

## 📈 Bed Status Flow

```
┌─────────────┐
│  Available  │ ◄───────────────┐
└──────┬──────┘                 │
       │                        │
       │ Patient Assigned    Staff Marks
       │                     as Available
       ▼                        │
┌─────────────┐                 │
│  Occupied   │                 │
└──────┬──────┘                 │
       │                        │
       │ Patient Discharged     │
       │                        │
       ▼                        │
┌─────────────┐                 │
│  Cleaning   │ ────────────────┘
└──────┬──────┘
       │
       │ Equipment Issue
       ▼
┌─────────────┐
│ Maintenance │ ◄──► Reserved
└─────────────┘
```

---

## 🎨 Color Coding System

| Status | Color | Hex Code | Icon |
|--------|-------|----------|------|
| Available | Green | #22c55e | 🛏️ |
| Occupied | Light Red | #fca5a5 | 🚪 |
| Cleaning | Orange | #f59e0b | 🧹 |
| Reserved | Blue | #3b82f6 | 🔒 |
| Maintenance | Gray | #6b7280 | ⚙️ |

---

## 🛠️ Technology Stack

### Frontend
- React 18
- Vite
- Socket.IO Client
- Recharts (for analytics)
- Lucide React (icons)
- React Toastify (notifications)
- Axios (HTTP client)

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- JWT (authentication)
- bcryptjs (password hashing)

---

## 📝 Future Enhancements

- [ ] Mobile app for on-the-go bed management
- [ ] Integration with hospital EHR systems
- [ ] Predictive analytics for bed availability
- [ ] Automated bed allocation based on AI
- [ ] Multi-hospital support
- [ ] Advanced reporting and export features

---

## 👨‍💻 Development Team

**Point of Contact:** Sai Anirudh Karre (saianirudh.karre@iiit.ac.in)

**Team Size:** 5

---

## 📄 License

This project is developed for hospital management purposes.

---

## 🆘 Support & Troubleshooting

### Common Issues

**Q: Login shows "Invalid credentials"**
A: Ensure you've run the seed script (`node seeders/seedData.js`)

**Q: Beds showing as 0**
A: Database might not be seeded. Run seed script and refresh.

**Q: Real-time updates not working**
A: Check that Socket.IO is connected (see browser console)

**Q: Cannot discharge patient**
A: Ensure you're logged in as ICU Manager or have appropriate role

---

## 📞 Contact

For questions, issues, or feature requests, contact:
- Email: saianirudh.karre@iiit.ac.in
- Project: BedManager - Hospital Bed Management System
