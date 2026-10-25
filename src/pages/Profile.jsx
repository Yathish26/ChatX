import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, LogOut } from 'lucide-react';
import { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { UsernameField, GenderField, AgeField, genderLabel, displayName, initialOf } from '../components/ProfileFields';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh flex flex-col bg-gray-950 text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-wide">Chat</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/chat" className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
              Chat
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex items-center gap-2 p-2 sm:px-4 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-4 sm:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-xl sm:text-2xl font-semibold">
            {initialOf(displayName(user))}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{displayName(user)}</h1>
            <p className="text-sm text-gray-400 truncate">{user.email}</p>
            {(user.gender || user.age) && (
              <p className="text-xs text-gray-400 mt-1">
                {[genderLabel(user.gender), user.age && `${user.age} years`].filter(Boolean).join(' · ')}
              </p>
            )}
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
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
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
  const [form, setForm] = useState({
    username: user.username || '',
    gender: user.gender || '',
    age: user.age ? String(user.age) : '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateProfile({ ...form, age: Number(form.age) });
      setSuccess('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Profile details" subtitle="Update your username and personal details.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        {/* Accounts created before usernames existed need to pick one. */}
        {!user.username && (
          <p className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-200">
            Complete your profile by choosing a username and adding your gender and age.
          </p>
        )}
        <FormError message={error} />
        <SuccessMessage message={success} />
        <UsernameField value={form.username} onChange={(username) => setForm({ ...form, username })} currentUsername={user.username} />
        <div className="grid grid-cols-2 gap-3">
          <GenderField value={form.gender} onChange={(gender) => setForm({ ...form, gender })} />
          <AgeField value={form.age} onChange={(age) => setForm({ ...form, age })} />
        </div>
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
        <TextField label="New password" type="password" value={form.newPassword} onChange={update('newPassword')} placeholder="Create a new password (min. 8 characters)" autoComplete="new-password" required />
        <TextField label="Confirm new password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" required />
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </Card>
  );
}
