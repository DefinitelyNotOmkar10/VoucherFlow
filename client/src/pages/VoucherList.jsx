import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'amount', label: 'Amount' },
  { value: 'expense_date', label: 'Expense Date' },
  { value: 'voucher_number', label: 'Voucher #' },
];

const TITLES = { my: 'My Vouchers', pending: 'Pending Approvals', all: 'All Vouchers' };

function StatusBadge({ status }) {
  const map = { DRAFT: ['draft', 'Draft'], PENDING_APPROVAL: ['pending', 'Pending Approval'], APPROVED: ['approved', 'Approved'], REJECTED: ['rejected', 'Rejected'] };
  const [cls, label] = map[status] || ['draft', status];
  return <span className={`badge badge-${cls}`}>{label}</span>;
}

export default function VoucherList({ mode }) {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '', status: mode === 'pending' ? 'PENDING_APPROVAL' : '',
    department: '', category: '', employeeName: '',
    dateFrom: '', dateTo: '', minAmount: '', maxAmount: '',
    sortBy: 'created_at', order: 'desc',
  });

  async function fetchVouchers() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const data = await api.get(`/api/vouchers?${params}`);
      setVouchers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVouchers(); }, [mode]);

  function handleChange(e) {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchVouchers();
  }

  return (
    <div className="page">
      <h1>{TITLES[mode]}</h1>

      <form className="filters" onSubmit={handleSearch}>
        <div className="form-group">
          <label>Search</label>
          <input name="search" value={filters.search} onChange={handleChange} placeholder="Voucher # or title" />
        </div>
        {mode !== 'pending' && (
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Department</label>
          <input name="department" value={filters.department} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Category</label>
          <input name="category" value={filters.category} onChange={handleChange} />
        </div>
        {mode !== 'my' && (
          <div className="form-group">
            <label>Employee Name</label>
            <input name="employeeName" value={filters.employeeName} onChange={handleChange} />
          </div>
        )}
        <div className="form-group">
          <label>Date From</label>
          <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Date To</label>
          <input type="date" name="dateTo" value={filters.dateTo} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Min ₹</label>
          <input type="number" name="minAmount" value={filters.minAmount} onChange={handleChange} min="0" />
        </div>
        <div className="form-group">
          <label>Max ₹</label>
          <input type="number" name="maxAmount" value={filters.maxAmount} onChange={handleChange} min="0" />
        </div>
        <div className="form-group">
          <label>Sort By</label>
          <select name="sortBy" value={filters.sortBy} onChange={handleChange}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Order</label>
          <select name="order" value={filters.order} onChange={handleChange}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>Apply</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Title</th>
                <th>Dept</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Expense Date</th>
                {mode !== 'my' && <th>Employee</th>}
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No vouchers found.</td></tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id}>
                    <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td>
                    <td>{v.expense_title}</td>
                    <td>{v.department}</td>
                    <td>&#8377;{Number(v.amount).toFixed(2)}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>{v.expense_date ? new Date(v.expense_date).toLocaleDateString() : '—'}</td>
                    {mode !== 'my' && <td>{v.employee_name}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
