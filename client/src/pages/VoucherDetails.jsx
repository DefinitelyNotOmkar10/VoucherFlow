import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

function StatusBadge({ status }) {
  const map = { DRAFT: ['draft', 'Draft'], PENDING_APPROVAL: ['pending', 'Pending Approval'], APPROVED: ['approved', 'Approved'], REJECTED: ['rejected', 'Rejected'] };
  const [cls, label] = map[status] || ['draft', status];
  return <span className={`badge badge-${cls}`}>{label}</span>;
}

export default function VoucherDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voucher, setVoucher] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dirSigFile, setDirSigFile] = useState(null);
  const [dirSigPreview, setDirSigPreview] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoadError('');
    try {
      const data = await api.get(`/api/vouchers/${id}`);
      setVoucher(data);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this draft voucher? This cannot be undone.')) return;
    try {
      await api.delete(`/api/vouchers/${id}`);
      navigate('/vouchers/my');
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleApprove() {
    if (!dirSigFile) { setActionError('Please upload your signature before approving.'); return; }
    setBusy(true);
    setActionError('');
    const fd = new FormData();
    fd.append('signature', dirSigFile);
    try {
      await api.postForm(`/api/vouchers/${id}/approve`, fd);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setActionError('Rejection reason is required.'); return; }
    setBusy(true);
    setActionError('');
    try {
      await api.post(`/api/vouchers/${id}/reject`, { rejection_reason: rejectReason });
      await load();
      setShowReject(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fmt(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString() : '—'; }

  if (loadError) return <div className="page"><div className="alert alert-error">{loadError}</div></div>;
  if (!voucher) return <div className="page loading">Loading…</div>;

  const isOwner = user.role === 'EMPLOYEE' && voucher.employee_id === user.id;
  const isDraft = voucher.status === 'DRAFT';
  const isPending = voucher.status === 'PENDING_APPROVAL';

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: 0 }}>{voucher.voucher_number}</h1>
        <StatusBadge status={voucher.status} />
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="form-card">
        <div className="detail-grid">
          <div className="detail-field"><label>Voucher Date</label><p>{fmt(voucher.voucher_date)}</p></div>
          <div className="detail-field"><label>Expense Date</label><p>{fmt(voucher.expense_date)}</p></div>
          <div className="detail-field"><label>Department</label><p>{voucher.department}</p></div>
          <div className="detail-field"><label>Category</label><p>{voucher.expense_category}</p></div>
          <div className="detail-field"><label>Expense Title</label><p>{voucher.expense_title}</p></div>
          <div className="detail-field"><label>Amount</label><p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>&#8377;{Number(voucher.amount).toFixed(2)}</p></div>
          {voucher.description && <div className="detail-field" style={{ gridColumn: '1/-1' }}><label>Description</label><p>{voucher.description}</p></div>}
          <div className="detail-field"><label>Employee</label><p>{voucher.employee_name} ({voucher.employee_code})</p></div>
          {voucher.director_name && <div className="detail-field"><label>Reviewed By</label><p>{voucher.director_name}</p></div>}
          {voucher.approval_date && <div className="detail-field"><label>Approval Date</label><p>{fmt(voucher.approval_date)}</p></div>}
          {voucher.rejection_reason && (
            <div className="detail-field" style={{ gridColumn: '1/-1' }}>
              <label>Rejection Reason</label>
              <p style={{ color: '#dc2626' }}>{voucher.rejection_reason}</p>
            </div>
          )}
        </div>

        <div className="sig-row">
          {voucher.employee_signature_path && (
            <div className="sig-block">
              <label>Employee Signature</label>
              <img src={voucher.employee_signature_path} alt="Employee signature" className="signature-preview" />
            </div>
          )}
          {voucher.director_signature_path && (
            <div className="sig-block">
              <label>Director Signature</label>
              <img src={voucher.director_signature_path} alt="Director signature" className="signature-preview" />
            </div>
          )}
        </div>

        {isOwner && isDraft && (
          <div className="btn-group no-print">
            <Link to={`/vouchers/${id}/edit`} className="btn btn-primary">Edit</Link>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        )}

        {user.role === 'DIRECTOR' && isPending && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }} className="no-print">
            <h3>Review Voucher</h3>
            <div className="form-group">
              <label>Your Signature (required to approve)</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setDirSigFile(file);
                    setDirSigPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {dirSigPreview && <img src={dirSigPreview} alt="Signature preview" className="signature-preview" />}
            </div>
            <div className="btn-group">
              <button className="btn btn-success" onClick={handleApprove} disabled={busy}>
                {busy ? 'Approving…' : 'Approve'}
              </button>
              <button className="btn btn-danger" onClick={() => { setShowReject(!showReject); setActionError(''); }}>
                {showReject ? 'Cancel Reject' : 'Reject'}
              </button>
            </div>
            {showReject && (
              <div style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Rejection Reason *</label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this voucher is being rejected…" />
                </div>
                <button className="btn btn-danger" onClick={handleReject} disabled={busy}>
                  {busy ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            )}
          </div>
        )}

        {user.role === 'ACCOUNTS' && (
          <div className="btn-group no-print" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print Voucher</button>
          </div>
        )}
      </div>
    </div>
  );
}
