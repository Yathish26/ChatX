import { Link } from 'react-router-dom';
import { MessageCircle, Users, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';

const features = [
  { icon: Zap, title: 'Real-time', text: 'Messages arrive instantly, no refresh needed.' },
  { icon: Users, title: 'Group chats', text: 'Talk one-on-one or bring the whole team.' },
  { icon: ShieldCheck, title: 'Private', text: 'Your conversations stay between you.' },
];

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-wide">Chat</span>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/signin" className="px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 blur-3xl bg-purple-600/30 rounded-full" />
          <h1 className="text-4xl sm:text-6xl font-bold">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Chat
            </span>
          </h1>
        </div>
        <p className="mt-5 max-w-xl text-gray-400 sm:text-lg">
          {user ? `Hi ${user.name}, good to see you.` : 'A simple place to talk with friends, teams and communities.'}
        </p>
        {!user && (
          <Link to="/register" className="mt-8 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-medium transition-colors">
            Start chatting
          </Link>
        )}

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
              <Icon className="w-6 h-6 text-purple-400" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Chat
      </footer>
    </div>
  );
}
