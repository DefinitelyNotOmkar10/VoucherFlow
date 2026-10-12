CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             VARCHAR(20)  NOT NULL CHECK (role IN ('EMPLOYEE', 'DIRECTOR', 'ACCOUNTS')),
  employee_code    VARCHAR(50),
  signature_path   VARCHAR(500),
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START 1;

CREATE TABLE IF NOT EXISTS vouchers (
  id                       SERIAL PRIMARY KEY,
  voucher_number           VARCHAR(50) NOT NULL UNIQUE
                             DEFAULT ('VCH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('voucher_number_seq')::TEXT, 4, '0')),
  voucher_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date             DATE NOT NULL,
  department               VARCHAR(255) NOT NULL,
  expense_title            VARCHAR(255) NOT NULL,
  expense_category         VARCHAR(255) NOT NULL,
  description              TEXT,
  amount                   NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status                   VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                             CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  employee_id              INTEGER NOT NULL REFERENCES users(id),
  employee_signature_path  VARCHAR(500),
  director_id              INTEGER REFERENCES users(id),
  director_signature_path  VARCHAR(500),
  approval_date            TIMESTAMP,
  rejection_reason         TEXT,
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW()
);
