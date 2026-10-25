import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Chat and start talking in seconds."
      footer={<>Already have an account? <Link to="/signin" className="text-purple-400 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField label="Name" type="text" value={form.name} onChange={update('name')} placeholder="Your name" autoComplete="name" required />
        <TextField label="Email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" required />
        <TextField label="Password" type="password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" autoComplete="new-password" required />
        <TextField label="Confirm password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Repeat your password" autoComplete="new-password" required />
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
