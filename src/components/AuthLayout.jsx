import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-950 text-white px-4 py-8 sm:py-12">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <span className="font-semibold tracking-wide">Chat</span>
      </Link>

      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-sm text-gray-400 text-center">{footer}</p>
    </div>
  );
}

// iOS Safari zooms into any input under 16px on focus, so inputs are text-base on phones.
export const INPUT_CLASS = 'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base sm:text-sm text-white';

export function TextField({ label, className = '', ...inputProps }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-300">{label}</span>
      <input
        {...inputProps}
        className={`mt-1.5 ${INPUT_CLASS} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:cursor-not-allowed ${className}`}
      />
    </label>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-3 sm:py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{message}</p>;
}
