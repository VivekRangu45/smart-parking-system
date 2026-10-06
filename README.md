# 🚗 Smart Parking Management & Reservation System

A full-stack smart parking management system that enables users to **view parking availability, reserve parking slots, receive QR-based booking tickets, and manage their reservations**, while providing administrators with a centralized dashboard for **parking occupancy, bookings, users, and revenue analytics**.

The system simulates real-world parking occupancy through structured occupancy data and integrates it with the booking workflow to maintain up-to-date slot availability.

---

## 📌 Project Overview

Finding an available parking space can be difficult in busy parking areas, while parking operators often lack a centralized system to monitor occupancy, reservations, and revenue.

This project addresses these problems by providing a centralized web-based parking platform where:

- Users can view available parking slots.
- Users can reserve a slot online.
- Each booking generates a unique QR ticket.
- The system prevents conflicting slot reservations.
- Parking occupancy can be updated through structured detection data.
- Administrators can monitor parking activity through a dedicated dashboard.
- User and administrator access is separated using role-based authentication.

The system currently models a parking facility containing:

```text
3 Zones
│
├── Zone A → 10 slots
├── Zone B → 10 slots
└── Zone C → 10 slots

Total = 30 Parking Slots
```

---

# 🎯 Problem Statement

Traditional parking management can suffer from:

- Difficulty finding available parking spaces
- Manual reservation processes
- Double booking of parking slots
- Lack of centralized occupancy information
- Limited visibility into parking operations
- Difficulty tracking bookings and revenue

The goal of this project is to build a **centralized digital parking management system** that connects parking availability, reservations, authentication, occupancy information, and administrative analytics.

---

# 💡 Solution

The system provides two major interfaces:

### 👤 User Interface

Users can:

- Register and log in
- View parking zones
- View available and occupied slots
- Reserve an available slot
- Receive a unique QR-based booking ticket
- View booking information
- Manage their parking reservation

### 🛠️ Admin Interface

Administrators can:

- Monitor parking occupancy
- View active bookings
- Monitor users
- View booking statistics
- Track revenue
- Manage parking/occupancy information
- Access administrator-specific analytics

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │       USER           │
                    │   Web Application    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + Vite       │
                    │     Frontend         │
                    └──────────┬───────────┘
                               │
                    HTTP / API Requests
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Node.js + Express     │
                    │      Backend          │
                    └──────┬─────────┬─────┘
                           │         │
                 ┌─────────┘         └──────────┐
                 ▼                              ▼
       ┌──────────────────┐            ┌──────────────────┐
       │ SQLite Database  │            │ Firebase Auth    │
       │ smart_parking    │            │ Authentication   │
       │ .sqlite          │            └──────────────────┘
       └──────────────────┘
                 │
                 ▼
       Parking / Booking Data
                 │
                 ▼
       ┌──────────────────────┐
       │ Admin Dashboard      │
       │ Occupancy / Revenue  │
       │ Bookings / Analytics │
       └──────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- React.js
- Vite
- React Router
- JavaScript
- CSS

## Backend

- Node.js
- Express.js
- REST APIs

## Database

- SQLite
- `smart_parking.sqlite`

## Authentication

- Firebase Authentication
- Firebase Admin SDK
- Role-based access control

## Other Technologies

- QR Code generation
- JSON-based occupancy data
- Git & GitHub

---

# 🅿️ Parking Model

The system contains three parking zones:

```text
Zone A
├── A1
├── A2
├── ...
└── A10

Zone B
├── B1
├── B2
├── ...
└── B10

Zone C
├── C1
├── C2
├── ...
└── C10
```

### Total Capacity

**30 parking slots**

Each slot maintains its availability state and booking information.

---

# 🔄 Core System Flow

## 1. User Authentication

The user first authenticates through Firebase Authentication.

```text
User
  │
  ▼
Firebase Authentication
  │
  ▼
Authenticated User
  │
  ▼
Application
```

The application then determines the user's role and provides the appropriate interface.

```text
USER  → User Dashboard

ADMIN → Admin Dashboard
```

---

# 2. Parking Availability

The application maintains the status of each parking slot.

A simplified representation is:

```text
A1 → Available
A2 → Occupied
A3 → Available
A4 → Available
...
```

Occupancy information can be supplied through structured JSON/object-detection data.

This allows the application to simulate how an external parking detection system could update slot availability.

> The current implementation uses **JSON-driven occupancy simulation** rather than claiming a fully deployed YOLO-based detection pipeline.

---

# 3. Slot Booking

A user selects an available parking slot.

The backend validates the booking before creating it.

The system checks conditions such as:

```text
Is the slot available?
        │
        ├── NO  → Reject booking
        │
        └── YES
             │
             ▼
       Create booking
             │
             ▼
       Generate QR ticket
             │
             ▼
       Return booking details
```

The default booking duration is **2 hours**.

---

# 4. Booking Conflict Prevention

One of the important backend responsibilities is preventing conflicting bookings.

Before creating a reservation, the backend validates the current slot state and booking information.

This prevents situations such as:

```text
User A → Slot A5
User B → Slot A5
```

at the same time.

The booking operation is validated against the database state so that the system does not simply trust the frontend.

---

# 5. QR-Based Booking Ticket

After a successful booking, the system generates a unique QR-based ticket.

The ticket can represent information such as:

```text
Booking ID
User
Zone
Parking Slot
Booking Time
Expiry Time
```

This provides a digital representation of the reservation and can be extended for parking-entry/exit verification.

---

# 👤 User Dashboard

The user dashboard focuses on the user's parking experience.

Typical functionality includes:

### Parking Availability

```text
Zone A
Available: 6 / 10

Zone B
Available: 4 / 10

Zone C
Available: 8 / 10
```

### Booking

The user can:

1. Select a zone
2. Select an available slot
3. Confirm the booking
4. Receive a QR ticket

### Booking Information

Users can view their active reservation and associated parking details.

---

# 🛠️ Admin Dashboard

The administrator has access to operational information that normal users should not see.

The dashboard can provide:

### Occupancy Analytics

```text
Total Slots       → 30
Occupied Slots    → ...
Available Slots   → ...
Occupancy Rate    → ...
```

### Booking Analytics

```text
Total Bookings
Active Bookings
Completed Bookings
```

### Revenue Analytics

```text
Total Revenue
Revenue by Zone
Revenue by Period
```

### User Analytics

```text
Registered Users
Active Users
Booking Activity
```

This creates a centralized monitoring interface for parking operations.

---

# 🔐 Role-Based Access Control

The application separates users into two major roles:

```text
USER
ADMIN
```

The frontend provides different interfaces based on the authenticated user's role, while backend authentication/authorization is used to protect administrative functionality.

```text
                 Firebase Authentication
                         │
                         ▼
                  Authenticated User
                         │
                    Role Check
                    /         \
                   /           \
                 USER         ADMIN
                  │             │
                  ▼             ▼
           User Dashboard   Admin Dashboard
```

This prevents normal users from accessing administrator-specific functionality.

---

# 🗄️ Database

The project uses SQLite for persistent application data.

Database:

```text
smart_parking.sqlite
```

The database stores information related to the parking system such as:

- Zones
- Parking slots
- Bookings
- Users/roles
- Parking availability
- Booking status
- Operational information

SQLite was selected because it provides a lightweight relational database suitable for this application and simplifies local development and testing.

---

# 📡 Occupancy Simulation

A key part of the project is connecting parking occupancy information with the booking system.

The current implementation uses structured JSON/object-detection data to represent parking occupancy.

Example concept:

```json
{
  "A1": "occupied",
  "A2": "available",
  "A3": "available",
  "A4": "occupied"
}
```

The backend processes this information and updates the application's understanding of slot availability.

This creates a clear separation between:

```text
Detection Layer
      ↓
Occupancy Data
      ↓
Backend
      ↓
Database
      ↓
Frontend
```

The detection layer can later be replaced or extended with an actual computer-vision service without redesigning the entire booking application.

---

# 🔄 Data Refresh

Parking availability is expected to change frequently.

The application therefore refreshes occupancy/booking information periodically so that users and administrators receive updated parking information rather than relying only on stale frontend state.

---

# 📂 Project Structure

A simplified structure is:

```text
smart-parking-system/
│
├── frontend/
│   ├── public/
│   │   └── occupancy.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── occupancy.js
│   │   │   ├── bookings.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   └── ...
│   ├── smart_parking.sqlite
│   └── package.json
│
├── README.md
└── ...
```

---

# 🔌 Backend API Responsibilities

The Express backend acts as the central application layer between the frontend and database.

Its responsibilities include:

- Authentication verification
- Authorization
- Parking slot management
- Occupancy updates
- Booking creation
- Booking validation
- Booking status management
- User-specific booking retrieval
- Admin analytics
- Database operations

The architecture follows a separation between:

```text
Frontend
   ↓
API
   ↓
Business Logic
   ↓
Database
```

This makes the system easier to maintain and extend.

---

# 📊 Example User Flow

```text
1. User opens application
          ↓
2. User logs in
          ↓
3. Firebase authenticates user
          ↓
4. User views parking availability
          ↓
5. User selects available zone/slot
          ↓
6. Backend validates availability
          ↓
7. Booking is created
          ↓
8. Unique QR ticket generated
          ↓
9. User receives booking confirmation
          ↓
10. Slot becomes unavailable
```

---

# 📊 Example Admin Flow

```text
1. Admin logs in
        ↓
2. Firebase authentication
        ↓
3. Backend verifies admin role
        ↓
4. Admin dashboard loads
        ↓
5. Occupancy data is displayed
        ↓
6. Active bookings are displayed
        ↓
7. Revenue and booking analytics
        ↓
8. Admin monitors parking operations
```

---

# 🚀 Deployment

The project was designed with separate frontend and backend components.

A possible deployment architecture is:

```text
                    Internet
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
       Vercel                     Render
      Frontend                    Backend
          │                         │
          └────────── API ──────────┘
                       │
                       ▼
                  Application
                    Database
```

The frontend can be deployed independently from the Express backend, allowing the application to follow a conventional full-stack deployment architecture.

---

# 🧠 Key Technical Challenges

## 1. Preventing Double Booking

The system must not rely only on frontend availability.

The backend validates slot availability before creating a reservation.

---

## 2. Synchronizing Occupancy and Booking Data

Parking availability can change independently from user bookings.

The system therefore separates occupancy information from booking logic and periodically refreshes the relevant data.

---

## 3. Role-Based Access

Normal users and administrators have different responsibilities.

Firebase authentication combined with backend authorization ensures that administrative functionality is protected.

---

## 4. Integrating Detection Data

Instead of tightly coupling the web application to a specific computer-vision implementation, occupancy information is represented through structured data.

This makes the architecture easier to extend with an actual detection service later.

---

# 📈 Future Improvements

Possible future improvements include:

- Real-time updates using WebSockets/Socket.IO
- Integration with an actual YOLO/OpenCV detection service
- Online payment integration
- QR scanning at parking entry/exit
- Automatic booking expiration
- Advanced revenue analytics
- Parking demand forecasting
- Peak-hour prediction
- Historical occupancy analytics
- Cloud database deployment
- Notification system for booking expiry
- Mobile application

---

# 🎯 Learning Outcomes

This project provided practical experience with:

- React.js
- Vite
- Node.js
- Express.js
- REST API design
- Firebase Authentication
- Firebase Admin SDK
- Role-Based Access Control
- SQLite
- Database design
- Booking validation
- Backend middleware
- JSON data processing
- QR code generation
- Full-stack application architecture
- Frontend/backend integration
- Deployment architecture

---

# 💼 Interview Perspective

This project demonstrates an end-to-end full-stack workflow:

```text
Real-World Problem
       ↓
System Design
       ↓
React Frontend
       ↓
Express REST API
       ↓
Authentication & Authorization
       ↓
SQLite Database
       ↓
Booking & Validation Logic
       ↓
Occupancy Integration
       ↓
Admin Analytics
```

The important part of the project is not simply displaying parking slots.

The system connects:

**Occupancy + Authentication + Booking + Database + QR Tickets + Administration**

into a single application.

---

# 📌 Key Features

| Feature | Implementation |
|---|---|
| Parking zones | 3 zones |
| Parking capacity | 30 slots |
| User authentication | Firebase Authentication |
| Admin authentication | Firebase + role-based authorization |
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite |
| Booking system | Backend validated |
| Default booking duration | 2 hours |
| QR ticket | Unique QR generation |
| Occupancy | JSON/object-detection simulation |
| Admin dashboard | Booking, occupancy, user & revenue analytics |
| User dashboard | Availability & booking management |
| API communication | REST |
| Deployment architecture | Vercel + Render |

---

# 👨‍💻 Author

**Vivek Rangu**

Computer Science & Engineering  
NIT Raipur

GitHub:  
https://github.com/VivekRangu45/smart-parking-system

---

## ⭐ Project Summary

**Smart Parking Management & Reservation System** is a full-stack application designed to digitize parking operations by combining **parking occupancy information, online reservations, QR-based tickets, authentication, database management, and administrative analytics**.

The project demonstrates how a real-world operational problem can be converted into a complete software system using modern web technologies.
