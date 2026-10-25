import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import SignIn from './pages/SignIn';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import NotFound from './pages/NotFound';
import { useAuth } from './AuthContext';

// Signed-in users have no reason to see the register/sign-in forms.
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

// `registeredOnly` keeps guests out of pages they have no use for (they have no profile).
function RequireAuth({ children, registeredOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (registeredOnly && user.isGuest) return <Navigate to="/chat" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
      <Route path="/profile" element={<RequireAuth registeredOnly><Profile /></RequireAuth>} />
      <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="/chat/:groupId" element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
