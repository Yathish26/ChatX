import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { useAuth } from '../AuthContext';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to Chat."
      footer={
        <>
          New here? <Link to="/register" className="text-purple-400 hover:underline">Start chatting</Link> as a guest or with an account
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Username or email"
          type="text"
          value={form.identifier}
          onChange={update('identifier')}
          placeholder="Enter your username or email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <TextField label="Password" type="password" value={form.password} onChange={update('password')} placeholder="Enter your password" autoComplete="current-password" required />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
    </AuthLayout>
  );
}
