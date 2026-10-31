import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

// Shared building blocks for the admin dashboard tabs.

// Loads `path` and reloads it whenever `path` changes or reload() is called.
export function useAdminData(request, path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    request(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [request, path, version]);

  return { data, setData, error, loading, reload: () => setVersion((v) => v + 1) };
}

export function ConfirmDialog({ title, confirmLabel, onClose, onConfirm, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 text-sm text-gray-400">{children}</div>
        {error && <div className="mt-4"><ErrorBox message={error} /></div>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, onRefresh, loading, children }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {onRefresh && (
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function DeleteButton({ onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function ErrorBox({ message }) {
  return <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{message}</p>;
}

export function LoadState({ loading, error }) {
  if (error) return <ErrorBox message={error} />;
  return loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div> : null;
}

export function Empty({ text }) {
  return <p className="py-10 text-center text-sm text-gray-500">{text}</p>;
}
