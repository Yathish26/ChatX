import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, UserPlus, UserRound } from 'lucide-react';
import AuthLayout, { TextField, SubmitButton, FormError } from '../components/AuthLayout';
import { UsernameField, GenderField, AgeField, isValidUsername } from '../components/ProfileFields';
import { useAuth } from '../AuthContext';
import { apiRequest } from '../api';

// Two-step "Start chatting" flow:
//   1. details — username, gender, age
//   2. choose  — continue as a guest straight away, or open the account form
//   3. account — add email + password to create a full account
export default function Register() {
  const { register, startGuest } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('details');
  const [details, setDetails] = useState({ username: '', gender: '', age: '' });
  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setDetail = (field) => (value) => setDetails({ ...details, [field]: value });
  const setAccountField = (field) => (e) => setAccount({ ...account, [field]: e.target.value });

  const goTo = (nextStep) => {
    setError('');
    setStep(nextStep);
  };

  const profile = { ...details, age: Number(details.age) };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    if (!isValidUsername(details.username)) {
      setError('Username must be 3–20 characters: letters, numbers, _ or .');
      return;
    }
    goTo('choose');
  };

  const [pendingChoice, setPendingChoice] = useState(null);

  const handleGuest = async () => {
    setError('');
    setPendingChoice('guest');
    setLoading(true);
    try {
      await startGuest(profile);
      navigate('/chat');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Check the username up front so they don't fill in email/password only to hit "taken".
  const handleChooseAccount = async () => {
    setError('');
    setPendingChoice('account');
    setLoading(true);
    try {
      const data = await apiRequest(`/auth/username-available?username=${encodeURIComponent(details.username)}`);
      if (data.available) {
        goTo('account');
      } else {
        setError(`@${details.username} is already taken. Go back to choose another, or continue as a guest.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (account.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ ...profile, email: account.email, password: account.password });
      navigate('/chat');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const titles = {
    details: { title: 'Start chatting', subtitle: 'Tell us a little about yourself to get started.' },
    choose: { title: 'How would you like to continue?', subtitle: 'Jump in as a guest, or create an account to keep your username.' },
    account: { title: 'Create your account', subtitle: `Secure @${details.username} with an email and password.` },
  };

  return (
    <AuthLayout
      {...titles[step]}
      footer={<>Already have an account? <Link to="/signin" className="text-purple-400 hover:underline">Sign in</Link></>}
    >
      {step !== 'details' && (
        <button
          type="button"
          onClick={() => goTo(step === 'account' ? 'choose' : 'details')}
          disabled={loading}
          className="-mt-2 mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          {/* Availability depends on whether they continue as a guest or an account,
              so it's checked when they choose. */}
          <UsernameField value={details.username} onChange={setDetail('username')} checkAvailability={false} />
          <div className="grid grid-cols-2 gap-3">
            <GenderField value={details.gender} onChange={setDetail('gender')} />
            <AgeField value={details.age} onChange={setDetail('age')} />
          </div>
          <SubmitButton loading={false}>Continue</SubmitButton>
        </form>
      )}

      {step === 'choose' && (
        <div className="flex flex-col gap-3">
          <FormError message={error} />
          <ChoiceCard
            icon={UserRound}
            title="Chat as a guest"
            description={`You'll appear as Guest-${details.username}. No email needed; the session lasts up to 24 hours.`}
            onClick={handleGuest}
            disabled={loading}
            loading={loading && pendingChoice === 'guest'}
          />
          <ChoiceCard
            icon={UserPlus}
            title="Create an account"
            description={`Keep @${details.username} for good, with a profile you can edit and sign in to anywhere.`}
            onClick={handleChooseAccount}
            disabled={loading}
            loading={loading && pendingChoice === 'account'}
          />
        </div>
      )}

      {step === 'account' && (
        <form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <TextField label="Email" type="email" value={account.email} onChange={setAccountField('email')} placeholder="Enter your email address" autoComplete="email" required />
          <TextField label="Password" type="password" value={account.password} onChange={setAccountField('password')} placeholder="Create a password (min. 8 characters)" autoComplete="new-password" required />
          <TextField label="Confirm password" type="password" value={account.confirmPassword} onChange={setAccountField('confirmPassword')} placeholder="Re-enter your password" autoComplete="new-password" required />
          <SubmitButton loading={loading}>Create account</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}

function ChoiceCard({ icon: Icon, title, description, onClick, disabled, loading = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-purple-500/60 hover:bg-purple-600/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-600/20 text-purple-300 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">{loading ? 'Please wait...' : title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 text-gray-500 group-hover:text-purple-300" />
    </button>
  );
}
