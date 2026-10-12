import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Communication', 'Medical', 'Other'];
const EMPTY = { expense_date: '', department: '', expense_title: '', expense_category: '', description: '', amount: '' };

export default function VoucherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sigFile, setSigFile] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/vouchers/${id}`).then((v) => {
      setForm({
        expense_date: v.expense_date?.slice(0, 10) || '',
        department: v.department || '',
        expense_title: v.expense_title || '',
        expense_category: v.expense_category || '',
        description: v.description || '',
        amount: v.amount || '',
      });
      setSigPreview(v.employee_signature_path || null);
    }).catch(() => navigate('/vouchers/my'));
  }, [id]);

  function validate() {
    const e = {};
    if (!form.expense_date) e.expense_date = 'Expense date is required';
    if (!form.department.trim()) e.department = 'Department is required';
    if (!form.expense_title.trim()) e.expense_title = 'Expense title is required';
    if (!form.expense_category) e.expense_category = 'Category is required';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Amount must be greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  }

  async function saveVoucher(vid) {
    if (vid) return api.put(`/api/vouchers/${vid}`, form);
    return api.post('/api/vouchers', form);
  }

  async function handleSaveDraft() {
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const v = await saveVoucher(id);
      navigate(`/vouchers/${v.id}/edit`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const v = await saveVoucher(id);
      const fd = new FormData();
      if (sigFile) fd.append('signature', sigFile);
      await api.postForm(`/api/vouchers/${v.id}/submit`, fd);
      navigate(`/vouchers/${v.id}`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>{id ? 'Edit Voucher' : 'New Voucher'}</h1>
      {apiError && <div className="alert alert-error">{apiError}</div>}
      <div className="form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Expense Date *</label>
            <input type="date" name="expense_date" value={form.expense_date} onChange={handleChange} />
            {errors.expense_date && <div className="form-error">{errors.expense_date}</div>}
          </div>
          <div className="form-group">
            <label>Department *</label>
            <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
            {errors.department && <div className="form-error">{errors.department}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Expense Title *</label>
            <input type="text" name="expense_title" value={form.expense_title} onChange={handleChange} placeholder="Short description" />
            {errors.expense_title && <div className="form-error">{errors.expense_title}</div>}
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select name="expense_category" value={form.expense_category} onChange={handleChange}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.expense_category && <div className="form-error">{errors.expense_category}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Any additional details…" />
        </div>

        <div className="form-group" style={{ maxWidth: '240px' }}>
          <label>Amount (₹) *</label>
          <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0.01" step="0.01" placeholder="0.00" />
          {errors.amount && <div className="form-error">{errors.amount}</div>}
        </div>

        <div className="form-group">
          <label>Your Signature (required to submit)</label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setSigFile(file);
                setSigPreview(URL.createObjectURL(file));
              }
            }}
          />
          {sigPreview && <img src={sigPreview} alt="Signature preview" className="signature-preview" />}
        </div>

        <div className="btn-group">
          <button className="btn btn-outline" onClick={handleSaveDraft} disabled={saving || submitting}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || submitting}>
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
