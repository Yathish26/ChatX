import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-5 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-3 text-gray-400">This page doesn&apos;t exist.</p>
      <Link to="/" className="mt-6 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium transition-colors">
        Back home
      </Link>
    </div>
  );
}
