const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRole, upload } = require('../middleware');

const ALLOWED_SORT = ['created_at', 'updated_at', 'amount', 'voucher_date', 'expense_date', 'voucher_number'];

// GET /api/vouchers
router.get('/', verifyToken, async (req, res) => {
  const { search, status, department, category, employeeName, dateFrom, dateTo, minAmount, maxAmount, sortBy, order } = req.query;
  const sort = ALLOWED_SORT.includes(sortBy) ? `v.${sortBy}` : 'v.created_at';
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const params = [];
  const conds = [];

  if (req.user.role === 'EMPLOYEE') {
    params.push(req.user.id);
    conds.push(`v.employee_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conds.push(`(v.voucher_number ILIKE $${params.length} OR v.expense_title ILIKE $${params.length})`);
  }
  if (status) { params.push(status); conds.push(`v.status = $${params.length}`); }
  if (department) { params.push(`%${department}%`); conds.push(`v.department ILIKE $${params.length}`); }
  if (category) { params.push(`%${category}%`); conds.push(`v.expense_category ILIKE $${params.length}`); }
  if (employeeName && req.user.role !== 'EMPLOYEE') { params.push(`%${employeeName}%`); conds.push(`u.name ILIKE $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conds.push(`v.expense_date >= $${params.length}`); }
  if (dateTo) { params.push(dateTo); conds.push(`v.expense_date <= $${params.length}`); }
  if (minAmount) { params.push(minAmount); conds.push(`v.amount >= $${params.length}`); }
  if (maxAmount) { params.push(maxAmount); conds.push(`v.amount <= $${params.length}`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const result = await pool.query(
      `SELECT v.*, u.name AS employee_name, u.employee_code
       FROM vouchers v JOIN users u ON u.id = v.employee_id
       ${where} ORDER BY ${sort} ${dir}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vouchers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.name AS employee_name, u.employee_code, d.name AS director_name
       FROM vouchers v
       JOIN users u ON u.id = v.employee_id
       LEFT JOIN users d ON d.id = v.director_id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    const v = result.rows[0];
    if (req.user.role === 'EMPLOYEE' && v.employee_id !== req.user.id) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers
router.post('/', verifyToken, requireRole('EMPLOYEE'), async (req, res) => {
  const { expense_date, department, expense_title, expense_category, description, amount } = req.body;
  if (!expense_date || !department || !expense_title || !expense_category || !amount) {
    return res.status(400).json({ error: 'expense_date, department, expense_title, expense_category, and amount are required' });
  }
  if (parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
  try {
    const result = await pool.query(
      `INSERT INTO vouchers (expense_date, department, expense_title, expense_category, description, amount, employee_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [expense_date, department, expense_title, expense_category, description || null, amount, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/vouchers/:id
router.put('/:id', verifyToken, requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    const v = existing.rows[0];
    if (v.employee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (v.status !== 'DRAFT') return res.status(409).json({ error: 'Only DRAFT vouchers can be edited' });

    const { expense_date, department, expense_title, expense_category, description, amount } = req.body;
    if (!expense_date || !department || !expense_title || !expense_category || !amount) {
      return res.status(400).json({ error: 'expense_date, department, expense_title, expense_category, and amount are required' });
    }
    if (parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await pool.query(
      `UPDATE vouchers SET expense_date=$1, department=$2, expense_title=$3, expense_category=$4,
       description=$5, amount=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [expense_date, department, expense_title, expense_category, description || null, amount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vouchers/:id
router.delete('/:id', verifyToken, requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    const v = existing.rows[0];
    if (v.employee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (v.status !== 'DRAFT') return res.status(409).json({ error: 'Only DRAFT vouchers can be deleted' });
    await pool.query('DELETE FROM vouchers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Voucher deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers/:id/submit
router.post('/:id/submit', verifyToken, requireRole('EMPLOYEE'), upload.single('signature'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    const v = existing.rows[0];
    if (v.employee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (v.status !== 'DRAFT') return res.status(409).json({ error: 'Only DRAFT vouchers can be submitted' });

    let sigPath = req.file ? '/uploads/' + req.file.filename : v.employee_signature_path;
    if (!sigPath) {
      const usr = await pool.query('SELECT signature_path FROM users WHERE id = $1', [req.user.id]);
      sigPath = usr.rows[0]?.signature_path || null;
    }
    if (!sigPath) return res.status(400).json({ error: 'Employee signature is required to submit' });

    const result = await pool.query(
      `UPDATE vouchers SET status='PENDING_APPROVAL', employee_signature_path=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [sigPath, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers/:id/approve
router.post('/:id/approve', verifyToken, requireRole('DIRECTOR'), upload.single('signature'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    if (existing.rows[0].status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ error: 'Only PENDING_APPROVAL vouchers can be approved' });
    }
    if (!req.file) return res.status(400).json({ error: 'Director signature is required' });

    const sigPath = '/uploads/' + req.file.filename;
    const result = await pool.query(
      `UPDATE vouchers SET status='APPROVED', director_id=$1, director_signature_path=$2,
       approval_date=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *`,
      [req.user.id, sigPath, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers/:id/reject
router.post('/:id/reject', verifyToken, requireRole('DIRECTOR'), async (req, res) => {
  const { rejection_reason } = req.body;
  if (!rejection_reason || !rejection_reason.trim()) {
    return res.status(400).json({ error: 'rejection_reason is required' });
  }
  try {
    const existing = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Voucher not found' });
    if (existing.rows[0].status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ error: 'Only PENDING_APPROVAL vouchers can be rejected' });
    }
    const result = await pool.query(
      `UPDATE vouchers SET status='REJECTED', director_id=$1, rejection_reason=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [req.user.id, rejection_reason.trim(), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
