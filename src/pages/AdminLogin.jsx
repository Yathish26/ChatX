import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout, { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { apiRequest } from '../api';
import { ADMIN_TOKEN_KEY } from './AdminDashboard';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (localStorage.getItem(ADMIN_TOKEN_KEY)) return <Navigate to="/admin" replace />;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/admin/login', { method: 'POST', body: form });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="Manage users, groups and messages."
      footer={<Link to="/" className="text-purple-400 hover:underline">Back to Chat</Link>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Admin username"
          type="text"
          value={form.username}
          onChange={update('username')}
          placeholder="Enter admin username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <TextField label="Password" type="password" value={form.password} onChange={update('password')} placeholder="Enter admin password" autoComplete="current-password" required />
        <SubmitButton loading={loading}>Sign in as admin</SubmitButton>
      </form>
    </AuthLayout>
  );
}
