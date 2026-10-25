import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { SubmitButton, FormError } from '../components/AuthLayout';
import { UsernameField, GenderField, AgeField } from '../components/ProfileFields';
import { useAuth } from '../AuthContext';

export default function GuestChat() {
  const { startGuest } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', gender: '', age: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (value) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await startGuest({ ...form, age: Number(form.age) });
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chat as a guest"
      subtitle="No account needed. Pick a name and jump straight into the conversation."
      footer={<>Want to keep your account? <Link to="/register" className="text-purple-400 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <UsernameField guest value={form.username} onChange={set('username')} />
        <div className="grid grid-cols-2 gap-3">
          <GenderField value={form.gender} onChange={set('gender')} />
          <AgeField value={form.age} onChange={set('age')} />
        </div>
        <p className="text-xs text-gray-400">
          Guest sessions last up to 24 hours and have no profile. When you end the session, your guest name is released.
        </p>
        <SubmitButton loading={loading}>Start chatting</SubmitButton>
      </form>
    </AuthLayout>
  );
}
