import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!data) return <div className="page loading">Loading…</div>;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="welcome">Welcome back, <strong>{user.name}</strong></p>

      {user.role === 'EMPLOYEE' && (
        <>
          <div className="cards">
            <div className="card"><div className="card-value">{data.total}</div><div className="card-label">Total</div></div>
            <div className="card"><div className="card-value">{data.draft}</div><div className="card-label">Draft</div></div>
            <div className="card"><div className="card-value">{data.pending}</div><div className="card-label">Pending</div></div>
            <div className="card"><div className="card-value">{data.approved}</div><div className="card-label">Approved</div></div>
            <div className="card"><div className="card-value">{data.rejected}</div><div className="card-label">Rejected</div></div>
            <div className="card"><div className="card-value">&#8377;{Number(data.total_amount_claimed).toFixed(2)}</div><div className="card-label">Amount Claimed</div></div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/vouchers/new" className="liquid-glass-link"><span>New voucher</span><span className="liquid-glass-button__arrow" aria-hidden="true">↗</span></Link>
          </div>
        </>
      )}

      {user.role === 'DIRECTOR' && (
        <>
          <div className="cards">
            <div className="card"><div className="card-value">{data.pending_count}</div><div className="card-label">Pending Approval</div></div>
            <div className="card"><div className="card-value">{data.approved_today}</div><div className="card-label">Approved Today</div></div>
            <div className="card"><div className="card-value">{data.rejected_today}</div><div className="card-label">Rejected Today</div></div>
            <div className="card"><div className="card-value">&#8377;{Number(data.total_pending_amount).toFixed(2)}</div><div className="card-label">Pending Amount</div></div>
          </div>
          {data.last_activity?.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2>Recent Activity</h2>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Voucher #</th><th>Employee</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.last_activity.map((a) => (
                      <tr key={a.id}>
                        <td><Link to={`/vouchers/${a.id}`}>{a.voucher_number}</Link></td>
                        <td>{a.employee_name}</td>
                        <td>&#8377;{Number(a.amount).toFixed(2)}</td>
                        <td>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {user.role === 'ACCOUNTS' && (
        <>
          <div className="cards">
            <div className="card"><div className="card-value">{data.total}</div><div className="card-label">Total</div></div>
            <div className="card"><div className="card-value">{data.pending}</div><div className="card-label">Pending</div></div>
            <div className="card"><div className="card-value">{data.approved}</div><div className="card-label">Approved</div></div>
            <div className="card"><div className="card-value">{data.rejected}</div><div className="card-label">Rejected</div></div>
            <div className="card"><div className="card-value">&#8377;{Number(data.total_approved_amount).toFixed(2)}</div><div className="card-label">Total Approved</div></div>
          </div>
          {data.last_approved?.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2>Recently Approved</h2>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Voucher #</th><th>Employee</th><th>Amount</th><th>Approval Date</th></tr></thead>
                  <tbody>
                    {data.last_approved.map((a) => (
                      <tr key={a.id}>
                        <td><Link to={`/vouchers/${a.id}`}>{a.voucher_number}</Link></td>
                        <td>{a.employee_name}</td>
                        <td>&#8377;{Number(a.amount).toFixed(2)}</td>
                        <td>{a.approval_date ? new Date(a.approval_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
