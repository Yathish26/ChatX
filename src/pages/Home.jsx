import { Link } from 'react-router-dom';
import { MessageCircle, Users, Zap, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { displayName, initialOf } from '../components/ProfileFields';

const features = [
  { icon: Zap, title: 'Real-time', text: 'Messages arrive instantly, no refresh needed.' },
  { icon: Users, title: 'Group chats', text: 'Talk one-on-one or bring the whole team.' },
  { icon: ShieldCheck, title: 'Private', text: 'Your conversations stay between you.' },
];

export default function Home() {
  const { user, signOut, endGuestSession } = useAuth();

  const identity = user && (
    <>
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center font-semibold text-white">
        {initialOf(displayName(user))}
      </span>
      <span className="hidden sm:inline">{displayName(user)}</span>
    </>
  );
  const signOutLabel = user?.isGuest ? 'End session' : 'Sign out';

  return (
    <div className="min-h-dvh flex flex-col bg-gray-950 text-white">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-wide">Chat</span>
          </div>
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/chat" className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                Chat
              </Link>
              {/* Guests have no profile page, so their name isn't a link. */}
              {user.isGuest ? (
                <span className="flex items-center gap-2 text-sm text-gray-300">{identity}</span>
              ) : (
                <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                  {identity}
                </Link>
              )}
              <button
                onClick={user.isGuest ? endGuestSession : signOut}
                aria-label={signOutLabel}
                title={signOutLabel}
                className="flex items-center gap-2 p-2 sm:px-4 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">{signOutLabel}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link to="/signin" className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                Start chatting
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-5 py-12 sm:py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 blur-3xl bg-purple-600/30 rounded-full" />
          <h1 className="text-[2.5rem] leading-tight sm:text-6xl font-bold">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Chat
            </span>
          </h1>
        </div>
        <p className="mt-5 max-w-xl text-gray-400 sm:text-lg">
          {user ? `Hi ${displayName(user)}, good to see you.` : 'A simple place to talk with friends, teams and communities.'}
        </p>
        {/* "Start chatting" leads to the flow where people choose guest or account. */}
        <Link
          to={user ? '/chat' : '/register'}
          className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-medium transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {user ? 'Open chat' : 'Start chatting'}
        </Link>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 text-left">
              <Icon className="w-6 h-6 text-purple-400" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Chat
      </footer>
    </div>
  );
}
