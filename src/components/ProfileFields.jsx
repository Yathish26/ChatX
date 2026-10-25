import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { apiRequest } from '../api';
import { INPUT_CLASS, TextField } from './AuthLayout';

// Keep in sync with GENDERS / MIN_AGE / MAX_AGE / USERNAME_REGEX in habackend/chat/models/user.model.js.
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
export const MIN_AGE = 13;
export const MAX_AGE = 120;
const USERNAME_REGEX = /^(?!\.)[a-z0-9_.]{3,20}(?<!\.)$/;
export const isValidUsername = (value) => USERNAME_REGEX.test(value.trim().toLowerCase());

// The server formats this as "@username" or "Guest-name". Accounts created before
// usernames existed have none, so fall back to their email.
export const displayName = (user) => user.displayName || `@${user.email.split('@')[0]}`;

// Avatar letter: first letter or digit, skipping the leading "@".
export const initialOf = (label) => (label || '?').replace(/^@/, '').charAt(0).toUpperCase();

export const genderLabel =(value) => GENDER_OPTIONS.find((o) => o.value === value)?.label || null;

const AVAILABILITY_DEBOUNCE_MS = 400;

// `currentUsername` is the user's existing username (on the profile form), which
// shouldn't be reported as "taken". With `checkAvailability={false}` only the format is
// validated (used when it isn't yet known whether the name is for a guest or an account).
export function UsernameField({ value, onChange, currentUsername = null, checkAvailability = true }) {
  const [status, setStatus] = useState('idle');
  const normalized = value.trim().toLowerCase();

  useEffect(() => {
    if (!normalized || normalized === currentUsername) {
      setStatus('idle');
      return undefined;
    }
    if (!USERNAME_REGEX.test(normalized)) {
      setStatus('invalid');
      return undefined;
    }
    if (!checkAvailability) {
      setStatus('idle');
      return undefined;
    }

    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      apiRequest(`/auth/username-available?username=${encodeURIComponent(normalized)}`)
        .then((data) => !cancelled && setStatus(data.available ? 'available' : 'taken'))
        // Availability is only a hint; the server re-checks on submit.
        .catch(() => !cancelled && setStatus('idle'));
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, currentUsername, checkAvailability]);

  const hints = {
    invalid: { className: 'text-amber-300', icon: X, text: '3–20 characters: letters, numbers, _ or .' },
    checking: { className: 'text-gray-400', icon: Loader2, text: 'Checking...', spin: true },
    available: { className: 'text-green-400', icon: Check, text: 'Username is available' },
    taken: { className: 'text-red-400', icon: X, text: 'That username is already taken' },
  };
  const hint = hints[status];

  // Usernames are stored lowercase, so show them that way while typing.
  const handleChange = (e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''));

  return (
    <div>
      <label className="block">
        <span className="text-sm text-gray-300">Username</span>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base sm:text-sm">@</span>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="Choose a username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            required
            className={`${INPUT_CLASS} pl-8 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
        </div>
      </label>
      {hint && (
        <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${hint.className}`}>
          <hint.icon className={`w-3.5 h-3.5 ${hint.spin ? 'animate-spin' : ''}`} />
          {hint.text}
        </p>
      )}
    </div>
  );
}

export function GenderField({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-300">Gender</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`mt-1.5 ${INPUT_CLASS} focus:outline-none focus:ring-2 focus:ring-purple-600 ${value ? '' : 'text-gray-500'}`}
      >
        <option value="" disabled className="bg-gray-900">Select gender</option>
        {GENDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-900 text-white">{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function AgeField({ value, onChange }) {
  return (
    <TextField
      label="Age"
      type="number"
      inputMode="numeric"
      min={MIN_AGE}
      max={MAX_AGE}
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter your age"
      required
    />
  );
}
