# VoucherFlow

VoucherFlow is an expense voucher management system. Employees create and submit expense claims, directors review and approve or reject them, and the accounts team can view and print vouchers.

## Features

- Role-based access for employees, directors, and accounts staff
- Draft creation and editing, voucher submission, and approval or rejection workflow
- Signature image uploads for employee submissions and director approvals
- Search, filtering, and sorting of vouchers
- Role-specific dashboards and printable voucher details

## Technology

- **Frontend:** React 18, Vite, React Router, CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL using `pg` and parameterized SQL
- **Authentication:** JSON Web Tokens (JWT) and bcrypt password hashing
- **Uploads:** Multer, stored under `server/uploads/`

## Project setup

### Requirements

- Node.js 18 or later and npm
- PostgreSQL 14 or later, running locally

### 1. Configure the server

From the project root, create a local environment file from the committed example:

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` and set values for:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port (default: `4000`) |
| `DATABASE_URL` | PostgreSQL connection string for the `voucherflow` database |
| `JWT_SECRET` | Secret used to sign authentication tokens; replace the example value with a long random secret |

The example connection string is `postgres://postgres:password@localhost:5432/voucherflow`. Change the username and password to match your local PostgreSQL setup. Keep `server/.env` private; it is excluded by `.gitignore`.

### 2. Install dependencies

Run these commands from the project root:

```powershell
cd server
npm install
cd ../client
npm install
cd ..
```

### 3. Create the database schema and demo users

With PostgreSQL running and `server/.env` configured, run:

```powershell
cd server
node seed.js
```

The seed script creates the `voucherflow` database if the configured database user has permission, applies [`server/schema.sql`](server/schema.sql), and inserts the demo accounts. Existing accounts with the same email are left unchanged. You can also start with an already-created `voucherflow` database; the schema is applied by the script.

### 4. Start the application

Open two terminals from the project root.

**Terminal 1 — API server:**

```powershell
cd server
npm run dev
```

The API runs at `http://localhost:4000`. Check that it is responding at `http://localhost:4000/api/health`.

**Terminal 2 — frontend:**

```powershell
cd client
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The Vite development server proxies `/api` and `/uploads` requests to the backend.

## Demo accounts

The seed script creates the following accounts. See [DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md) for a standalone copy.

| Role | Email | Password |
| --- | --- | --- |
| Director | `director@company.com` | `director123` |
| Accounts | `accounts@company.com` | `accounts123` |
| Employee | `bob@company.com` | `employee123` |
| Employee | `carol@company.com` | `employee123` |

These are for local demonstration only. Replace or remove them, and use a secure `JWT_SECRET`, before deploying for real users.

## Database schema

The database bootstrap schema is [`server/schema.sql`](server/schema.sql). It creates the following tables and sequence:

### `users`

Stores the user account and role information. `email` is unique; `password_hash` contains a bcrypt hash rather than a plain-text password. `role` is constrained to `EMPLOYEE`, `DIRECTOR`, or `ACCOUNTS`. `signature_path` optionally points to the user's uploaded signature image.

### `vouchers`

Stores expense claims, their status, and approval details. Each voucher belongs to an employee through `employee_id`; `director_id` references the director who approved or rejected it and may be empty until review. Employee and director signature paths are stored with the voucher for the relevant workflow steps.

Important database rules:

- `voucher_number` is unique and generated using the `voucher_number_seq` sequence in the `VCH-YYYY-NNNN` format.
- `voucher_date` defaults to the current date; `expense_date` is required.
- `amount` must be greater than zero and is stored as `NUMERIC(12,2)`.
- `status` is limited to `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, or `REJECTED`, and defaults to `DRAFT`.
- Voucher rows reference their employee and, after a decision, the director through foreign keys to `users`.
- `approval_date`, `rejection_reason`, and signature paths record the outcome and supporting signature data.

The SQL schema file is the source of truth for this project. There is no separate versioned migrations directory; the seed script applies the idempotent `CREATE TABLE IF NOT EXISTS` schema during setup.

## API documentation

All endpoints are prefixed with `/api`. Protected endpoints require an `Authorization: Bearer <token>` header. A successful login returns a JWT that expires after 24 hours. JSON request bodies use `Content-Type: application/json`; signature uploads use `multipart/form-data` with the field name `signature`.

### Health and authentication

| Method | Endpoint | Access | Request / result |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Returns API health status. |
| `POST` | `/api/auth/login` | Public | JSON `{ "email": "...", "password": "..." }`; returns `{ token, user }`. |
| `GET` | `/api/auth/me` | Any signed-in user | Returns the current user's profile. |
| `POST` | `/api/auth/signature` | Any signed-in user | Multipart `signature` image; updates the user's profile signature. |

### Dashboard and vouchers

| Method | Endpoint | Access | Request / result |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard` | Any signed-in user | Returns statistics appropriate to the user's role. |
| `GET` | `/api/vouchers` | Any signed-in user | Returns vouchers visible to the user. Supports the query parameters below. |
| `GET` | `/api/vouchers/:id` | Any signed-in user | Returns voucher details; employees can only access their own vouchers. |
| `POST` | `/api/vouchers` | Employee | JSON fields: `expense_date`, `department`, `expense_title`, `expense_category`, `amount`; optional `description`. Creates a draft. |
| `PUT` | `/api/vouchers/:id` | Owning employee | Same fields as create; only a draft can be edited. |
| `DELETE` | `/api/vouchers/:id` | Owning employee | Deletes a draft. |
| `POST` | `/api/vouchers/:id/submit` | Owning employee | Multipart `signature` is optional if a signature is already saved on the voucher or employee profile. Moves a draft to pending approval. |
| `POST` | `/api/vouchers/:id/approve` | Director | Requires multipart `signature`. Approves a pending voucher and records the director and approval time. |
| `POST` | `/api/vouchers/:id/reject` | Director | JSON `{ "rejection_reason": "..." }`. Rejects a pending voucher. |

`GET /api/vouchers` accepts these optional query parameters:

| Parameter | Meaning |
| --- | --- |
| `search` | Matches voucher number or expense title. |
| `status` | Filters by voucher status. |
| `department`, `category` | Partial, case-insensitive matches. |
| `employeeName` | Partial employee name match; applies to non-employee roles. |
| `dateFrom`, `dateTo` | Inclusive bounds on `expense_date` (`YYYY-MM-DD`). |
| `minAmount`, `maxAmount` | Inclusive amount bounds. |
| `sortBy` | One of `created_at`, `updated_at`, `amount`, `voucher_date`, `expense_date`, or `voucher_number`. Defaults to `created_at`. |
| `order` | `asc` for ascending; otherwise descending. |

The API returns JSON. Common error responses include `400` for invalid or missing input, `401` for missing/invalid/expired authentication, `403` for a role or ownership violation, `404` when a resource is not found or is not visible, and `409` when an operation is not valid for the voucher's current status.

### Example: sign in and create a draft

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@company.com","password":"employee123"}'
```

Use the returned token in the authorization header for protected routes:

```bash
curl -X POST http://localhost:4000/api/vouchers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expense_date":"2026-10-12","department":"Science","expense_title":"Lab supplies","expense_category":"Supplies","amount":1250.00}'
```

## Development assumptions

- A submitted voucher immediately enters `PENDING_APPROVAL`; there is no separate `SUBMITTED` status.
- Employees can only see and manage their own vouchers. They can edit or delete them only while the status is `DRAFT`.
- Approved and rejected vouchers are read-only through the application workflow.
- An employee signature is required to submit. The app can use a signature uploaded during submission, a saved voucher signature, or the employee's profile signature.
- Directors provide a signature when approving; rejection requires a non-empty reason.
- Accounts users have read-only voucher access and can print approved voucher details; they cannot approve or reject.
- Signature images accept PNG, JPG, and JPEG files up to 2 MB and are stored locally in `server/uploads/`. This local storage is suitable for the demo but needs persistent shared storage for a multi-instance deployment.
- The database and application use the configured PostgreSQL server's date/time settings for current dates and approval timestamps.

## Configuration and database files

- [`server/.env.example`](server/.env.example) — template for local server configuration; copy it to `server/.env` and fill in local values.
- [`server/schema.sql`](server/schema.sql) — PostgreSQL schema and voucher number sequence.
- [`server/seed.js`](server/seed.js) — applies the schema and creates demo user accounts.
- [`DEMO_CREDENTIALS.md`](DEMO_CREDENTIALS.md) — standalone demo account reference.
