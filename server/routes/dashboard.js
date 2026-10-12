const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware');

// GET /api/dashboard
router.get('/', verifyToken, async (req, res) => {
  const { id, role } = req.user;
  try {
    if (role === 'EMPLOYEE') {
      const stats = await pool.query(
        `SELECT
           COUNT(*)                                              AS total,
           COUNT(*) FILTER (WHERE status = 'DRAFT')            AS draft,
           COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending,
           COUNT(*) FILTER (WHERE status = 'APPROVED')         AS approved,
           COUNT(*) FILTER (WHERE status = 'REJECTED')         AS rejected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS total_amount_claimed
         FROM vouchers WHERE employee_id = $1`,
        [id]
      );
      return res.json(stats.rows[0]);
    }

    if (role === 'DIRECTOR') {
      const stats = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')                              AS pending_count,
           COUNT(*) FILTER (WHERE status = 'APPROVED' AND approval_date::date = CURRENT_DATE) AS approved_today,
           COUNT(*) FILTER (WHERE status = 'REJECTED' AND updated_at::date = CURRENT_DATE)   AS rejected_today,
           COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_APPROVAL'), 0)              AS total_pending_amount
         FROM vouchers`
      );
      const activity = await pool.query(
        `SELECT v.id, v.voucher_number, v.status, v.updated_at, u.name AS employee_name, v.amount
         FROM vouchers v
         JOIN users u ON u.id = v.employee_id
         WHERE v.status IN ('APPROVED', 'REJECTED')
         ORDER BY v.updated_at DESC LIMIT 5`
      );
      return res.json({ ...stats.rows[0], last_activity: activity.rows });
    }

    if (role === 'ACCOUNTS') {
      const stats = await pool.query(
        `SELECT
           COUNT(*)                                              AS total,
           COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending,
           COUNT(*) FILTER (WHERE status = 'APPROVED')         AS approved,
           COUNT(*) FILTER (WHERE status = 'REJECTED')         AS rejected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS total_approved_amount
         FROM vouchers`
      );
      const lastApproved = await pool.query(
        `SELECT v.id, v.voucher_number, v.amount, v.approval_date, u.name AS employee_name
         FROM vouchers v
         JOIN users u ON u.id = v.employee_id
         WHERE v.status = 'APPROVED'
         ORDER BY v.approval_date DESC LIMIT 5`
      );
      return res.json({ ...stats.rows[0], last_approved: lastApproved.rows });
    }

    res.status(400).json({ error: 'Unknown role' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
