# 🏢 StaffHub HRMS v2 — Enterprise HR Management System

A production-ready full-stack **HRMS** built with the **MERN** stack (MongoDB, Express.js, React, Node.js).  
Featuring JWT authentication, role-based access control, leave management, notifications, audit logs, and dark mode.

---

## 🔑 Default Login Credentials (after `npm run seed`)

| Role | Email / Employee ID | Password |
|------|---------------------|----------|
| **Admin** | `admin@staffhub.com` | `Admin@1234` |
| **Employee** | `john.doe@company.com` | `Employee@1234` |
| **Employee** | `jane.smith@company.com` | `Employee@1234` |
| **Employee (First Login)** | `EMP-1005` | `Employee@1234` |

> **First Login Flow**: EMP-1005 (Michael Wilson) will be forced to set a new password and security question on first sign-in.

---

## ✨ Features

### 🔐 Authentication & Security
- ✅ JWT-based login (email or Employee ID)
- ✅ Role-based access control (Admin / Employee)
- ✅ First-login forced password change flow
- ✅ Forgot password via security question/answer
- ✅ Show/hide password, Remember Me
- ✅ Password strength rules (8+ chars, uppercase, lowercase, number, symbol)
- ✅ Auto-logout on expired/invalid token

### 👥 Employee Management (Admin)
- ✅ Create, Read, Update, Delete employees
- ✅ Profile photo upload (JPEG / PNG / WebP, max 5 MB)
- ✅ Admin password reset for any employee
- ✅ Status management (Active / Inactive / Resigned / Terminated)

### 🔍 Search & Filtering
- ✅ Instant debounced search (name, email, designation, department, ID)
- ✅ Department & status filter dropdowns
- ✅ Sortable table columns
- ✅ Server-side pagination (8 per page)
- ✅ Export to styled Excel (`.xlsx`)

### 📋 Leave Management
- ✅ 8 leave types (Casual, Sick, Earned, WFH, Maternity, Paternity, LOP, Emergency)
- ✅ Balance enforcement for Casual / Sick / Earned leave
- ✅ Date overlap detection
- ✅ File attachment upload (PDF/JPG, up to 10MB)
- ✅ Admin approve / reject / request clarification workflow
- ✅ Automatic balance deduction on approval
- ✅ Employee-specific leave history

### 📊 Dashboards
- ✅ **Admin**: Stats counters, department distribution chart, monthly hiring trend chart, recent leave approvals table, recent staff list
- ✅ **Employee**: Leave balances, leave stats, upcoming approved leaves, recent notifications feed

### 🔔 Notifications
- ✅ Real-time-like notification badges in sidebar
- ✅ Mark individual / all notifications as read
- ✅ Triggered on leave status changes

### 🕵️ Audit Logs
- ✅ Track all admin actions (create, approve, reject, delete, reset)
- ✅ Admin-only audit log viewer

### 🎨 UI/UX
- ✅ Premium glassmorphism design with violet brand palette
- ✅ Dark mode (class-based, persisted to `localStorage`)
- ✅ Responsive sidebar (mobile drawer + desktop fixed)
- ✅ Skeleton loading states
- ✅ Toast notifications (react-hot-toast)
- ✅ Animated 404 page & error boundaries

---

## 🗂️ Project Structure

```
Project/
├── backend/
│   ├── config/
│   │   ├── db.js                       # MongoDB connection
│   │   └── seed.js                     # Database seeder
│   ├── controllers/
│   │   ├── authController.js           # Login, first-login, JWT, forgot-password
│   │   ├── employeeController.js       # Employee CRUD + avatar upload
│   │   ├── leaveController.js          # Apply, approve, reject leaves + balances
│   │   ├── notificationController.js   # Fetch + mark notifications
│   │   ├── dashboardController.js      # Role-specific dashboard metrics
│   │   └── auditController.js          # Audit log viewer
│   ├── middleware/
│   │   ├── auth.js                     # JWT protect + authorize middleware
│   │   ├── errorHandler.js             # Global error handler
│   │   └── upload.js                   # Multer config (avatars + attachments)
│   ├── models/
│   │   ├── Employee.js                 # Extended schema with auth fields
│   │   ├── LeaveRequest.js
│   │   ├── LeaveBalance.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── auditRoutes.js
│   ├── uploads/
│   │   ├── avatars/                    # Profile photos
│   │   └── attachments/               # Leave attachments
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ConfirmModal.jsx
    │   │   ├── ErrorBoundary.jsx
    │   │   ├── ProtectedRoute.jsx      # Auth + role guard
    │   │   ├── SkeletonLoader.jsx
    │   │   ├── SortableHeader.jsx
    │   │   └── ToastProvider.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx         # JWT session state
    │   ├── layouts/
    │   │   └── MainLayout.jsx          # Sidebar + header (role-aware)
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── FirstLogin.jsx
    │   │   ├── Dashboard.jsx           # Role router → Admin/Employee dashboard
    │   │   ├── AdminDashboard.jsx
    │   │   ├── EmployeeDashboard.jsx
    │   │   ├── EmployeeList.jsx
    │   │   ├── EmployeeForm.jsx
    │   │   ├── EmployeeDetail.jsx
    │   │   ├── EmployeeProfile.jsx
    │   │   ├── LeaveApplication.jsx
    │   │   ├── LeaveHistory.jsx
    │   │   ├── Notifications.jsx
    │   │   ├── AuditLogs.jsx
    │   │   ├── Settings.jsx
    │   │   └── NotFound.jsx
    │   ├── services/
    │   │   └── api.js                  # Axios client + all API calls + JWT interceptor
    │   ├── App.jsx                     # AuthProvider + ProtectedRoute + all routes
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js              # darkMode: 'class' + brand palette
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) — local or Atlas

---

### 1. Backend Setup

```bash
cd backend
npm install
```

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/employee_management
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=5
JWT_SECRET=super_secret_staffhub_hrms_token_key_2026
JWT_EXPIRE=7d
```

```bash
# Start backend dev server
npm run dev

# Seed the database with sample users, leaves & notifications
npm run seed
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173** — you'll be redirected to `/login` automatically.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/auth/login` | Login with email/employeeId + password | Public |
| `POST` | `/api/auth/first-login` | Complete first-login setup | Public |
| `GET`  | `/api/auth/me` | Get current user profile | Private |
| `POST` | `/api/auth/change-password` | Change own password | Private |
| `GET`  | `/api/auth/forgot-password-question/:id` | Get security question | Public |
| `POST` | `/api/auth/forgot-password-reset` | Reset password via security answer | Public |

### Employees
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/employees` | List (search, filter, paginate) | Admin |
| `GET`  | `/api/employees/export` | Export to Excel | Admin |
| `GET`  | `/api/employees/:id` | Get by ID | Private |
| `POST` | `/api/employees` | Create employee | Admin |
| `PUT`  | `/api/employees/:id` | Update employee | Private |
| `DELETE` | `/api/employees/:id` | Delete employee | Admin |
| `POST` | `/api/employees/:id/upload-avatar` | Upload profile photo | Private |

### Leave Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/leaves` | Apply for leave | Employee |
| `GET`  | `/api/leaves` | Get leaves (own / all for admin) | Private |
| `GET`  | `/api/leaves/balance` | Get leave balance | Private |
| `PUT`  | `/api/leaves/:id/status` | Approve/Reject/Clarify | Admin |

### Other
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/notifications` | Get notifications | Private |
| `PUT`  | `/api/notifications/:id/read` | Mark as read | Private |
| `PUT`  | `/api/notifications/read-all` | Mark all as read | Private |
| `GET`  | `/api/dashboard` | Role-based dashboard data | Private |
| `GET`  | `/api/audit-logs` | System audit logs | Admin |

---

## 🛡️ Security

- **JWT** — Bearer tokens, 7-day expiry, auto-invalidated on role/status change
- **Helmet** — 11 security HTTP headers
- **Rate Limiter** — 100 requests / 15 min / IP on all `/api/*` routes
- **CORS** — Allowlist-only (no wildcards)
- **bcryptjs** — Passwords & security answers hashed with salt rounds: 10
- **express-validator** — Server-side validation on all write operations
- **Multer** — MIME type whitelist + size cap for file uploads

---

## 🎨 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Routing | React Router v6 |
| HTTP Client | Axios (with JWT interceptors) |
| Notifications | react-hot-toast |
| Icons | lucide-react |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | jsonwebtoken, bcryptjs |
| File Upload | Multer |
| Excel Export | ExcelJS |
| Security | Helmet, express-rate-limit |
| Validation | express-validator |

---

## 📝 Scripts

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot-reload) |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## 📄 License

MIT License — feel free to use this project for personal or commercial purposes.
