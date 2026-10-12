# VoucherFlow

A simple Expense Voucher Management System built as an internship assignment.  
Employees submit expense vouchers for director approval; accounts can view and print approved vouchers.

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 (Vite), plain CSS, react-router-dom v6, fetch |
| Backend  | Node.js, Express |
| Database | PostgreSQL (raw SQL via `pg`) |
| Auth     | JWT (`jsonwebtoken`), `bcrypt` |
| Files    | `multer` (signature images) |

---

## File Structure

```
VoucherFlow/
├── .gitignore
├── README.md
├── start.bat
├── server/
│   ├── package.json
│   ├── index.js
│   ├── db.js
│   ├── schema.sql
│   ├── seed.js
│   ├── .env.example
│   ├── middleware.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── vouchers.js
│   │   └── dashboard.js
│   └── uploads/
│       └── .gitkeep
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── AuthContext.jsx
        ├── styles.css
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── VoucherForm.jsx
            ├── VoucherList.jsx
            └── VoucherDetails.jsx
```

---

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 2. Configure environment
```bash
cd server
cp .env.example .env
# Edit .env and set your PostgreSQL credentials, PORT, and JWT_SECRET
```

### 3. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 4. Seed database and demo users
```bash
cd server && node seed.js
```
*(Automatically creates `voucherflow` database, applies `schema.sql`, and creates demo users)*

### 5. Run the application
```bash
# Terminal 1 - Backend (http://localhost:4000)
cd server && npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd client && npm run dev
```

---

## Demo Logins

| Role     | Email                   | Password     | Code    |
|----------|-------------------------|--------------|---------|
| Director | director@company.com    | director123  | DIR-001 |
| Accounts | accounts@company.com    | accounts123  | ACC-001 |
| Employee | bob@company.com         | employee123  | EMP-001 |
| Employee | carol@company.com       | employee123  | EMP-002 |

---

## Database Schema

### `users`
| Column           | Type         | Notes |
|-----------------|--------------|-------|
| id              | SERIAL PK    | |
| name            | VARCHAR(255) | |
| email           | VARCHAR(255) | UNIQUE |
| password_hash   | VARCHAR(255) | bcrypt |
| role            | VARCHAR(20)  | EMPLOYEE / DIRECTOR / ACCOUNTS |
| employee_code   | VARCHAR(50)  | |
| signature_path  | VARCHAR(500) | path under /uploads |
| created_at      | TIMESTAMP    | |

### `vouchers`
| Column                  | Type           | Notes |
|------------------------|----------------|-------|
| id                     | SERIAL PK      | |
| voucher_number         | VARCHAR(50)    | UNIQUE, auto: VCH-YYYY-NNNN |
| voucher_date           | DATE           | defaults to today |
| expense_date           | DATE           | required |
| department             | VARCHAR(255)   | required |
| expense_title          | VARCHAR(255)   | required |
| expense_category       | VARCHAR(255)   | required |
| description            | TEXT           | optional |
| amount                 | NUMERIC(12,2)  | > 0 |
| status                 | VARCHAR(30)    | DRAFT / PENDING_APPROVAL / APPROVED / REJECTED |
| employee_id            | FK → users     | creator |
| employee_signature_path| VARCHAR(500)   | set on submit |
| director_id            | FK → users     | nullable, set on approve/reject |
| director_signature_path| VARCHAR(500)   | set on approve |
| approval_date          | TIMESTAMP      | set on approve |
| rejection_reason       | TEXT           | set on reject |
| created_at / updated_at| TIMESTAMP      | |

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT + user |
| GET | `/api/auth/me` | Any | Current user profile |
| POST | `/api/auth/signature` | Any | Upload signature to own profile |
| GET | `/api/dashboard` | Any | Role-specific stats |
| GET | `/api/vouchers` | Any | List vouchers (filtered, sorted) |
| GET | `/api/vouchers/:id` | Any | Single voucher |
| POST | `/api/vouchers` | EMPLOYEE | Create draft |
| PUT | `/api/vouchers/:id` | EMPLOYEE | Update draft |
| DELETE | `/api/vouchers/:id` | EMPLOYEE | Delete draft |
| POST | `/api/vouchers/:id/submit` | EMPLOYEE | Submit draft (requires signature) |
| POST | `/api/vouchers/:id/approve` | DIRECTOR | Approve pending (requires signature) |
| POST | `/api/vouchers/:id/reject` | DIRECTOR | Reject pending (requires reason) |

---

## Assumptions

- **"Submitted" and "Pending Approval" are the same status** (`PENDING_APPROVAL`). When an employee submits a voucher it moves directly to pending; there is no intermediate "submitted" state.
- Only the **owning employee** can edit or delete a voucher, and only while it is in `DRAFT` status.
- Once a voucher is `APPROVED` or `REJECTED` it becomes **read-only** for all roles.
- A director's signature is uploaded fresh at the time of each approval; the profile signature is only used for employees.
- Accounts role has **read-only** access plus a print function; they cannot approve or reject.
- File uploads (signatures) are stored locally in `server/uploads/`.
