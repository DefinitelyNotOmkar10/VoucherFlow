import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VoucherForm from './pages/VoucherForm';
import VoucherList from './pages/VoucherList';
import VoucherDetails from './pages/VoucherDetails';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-brand"><Link to="/">VoucherFlow</Link></div>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        {user?.role === 'EMPLOYEE' && (
          <>
            <Link to="/vouchers/my">My Vouchers</Link>
            <Link to="/vouchers/new">New Voucher</Link>
          </>
        )}
        {user?.role === 'DIRECTOR' && (
          <>
            <Link to="/vouchers/pending">Pending</Link>
            <Link to="/vouchers/all">All Vouchers</Link>
          </>
        )}
        {user?.role === 'ACCOUNTS' && (
          <Link to="/vouchers/all">All Vouchers</Link>
        )}
      </div>
      <div className="navbar-user">
        <span>{user?.name} ({user?.role})</span>
        <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/vouchers/new" element={<ProtectedRoute roles={['EMPLOYEE']}><VoucherForm /></ProtectedRoute>} />
          <Route path="/vouchers/:id/edit" element={<ProtectedRoute roles={['EMPLOYEE']}><VoucherForm /></ProtectedRoute>} />
          <Route path="/vouchers/my" element={<ProtectedRoute roles={['EMPLOYEE']}><VoucherList mode="my" /></ProtectedRoute>} />
          <Route path="/vouchers/pending" element={<ProtectedRoute roles={['DIRECTOR']}><VoucherList mode="pending" /></ProtectedRoute>} />
          <Route path="/vouchers/all" element={<ProtectedRoute roles={['DIRECTOR', 'ACCOUNTS']}><VoucherList mode="all" /></ProtectedRoute>} />
          <Route path="/vouchers/:id" element={<ProtectedRoute><VoucherDetails /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
