import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-wide">Chat</span>
          </Link>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 flex flex-col gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-2xl font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{user.name}</h1>
            <p className="text-sm text-gray-400 truncate">{user.email}</p>
            {user.createdAt && (
              <p className="text-xs text-gray-500 mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <ProfileForm />
        <ChangePasswordForm />
      </main>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SuccessMessage({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{message}</p>;
}

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateProfile({ name });
      setSuccess('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Profile details" subtitle="Update how your name appears to others.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <FormError message={error} />
        <SuccessMessage message={success} />
        <TextField label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        <TextField label="Email" type="email" value={user.email} disabled className="opacity-60" />
        <SubmitButton loading={loading}>Save changes</SubmitButton>
      </form>
    </Card>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(EMPTY_PASSWORDS);
      setSuccess('Password changed. Other devices have been signed out.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Change password" subtitle="You'll stay signed in here; other devices will be signed out.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <FormError message={error} />
        <SuccessMessage message={success} />
        <TextField label="Current password" type="password" value={form.currentPassword} onChange={update('currentPassword')} autoComplete="current-password" required />
        <TextField label="New password" type="password" value={form.newPassword} onChange={update('newPassword')} placeholder="At least 8 characters" autoComplete="new-password" required />
        <TextField label="Confirm new password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" required />
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </Card>
  );
}
