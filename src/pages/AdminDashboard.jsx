import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Hash, Images, LayoutDashboard, LogOut, MessageCircle, MessagesSquare,
  Search, Shield, Users, X,
} from 'lucide-react';
import { apiRequest } from '../api';
import { INPUT_CLASS } from '../components/AuthLayout';
import { initialOf } from '../components/ProfileFields';
import { ConfirmDialog, DeleteButton, Empty, ErrorBox, LoadState, SectionHeader, useAdminData } from '../components/AdminUI';
import AlbumsTab from '../components/AdminAlbums';

export const ADMIN_TOKEN_KEY = 'chatAdminToken';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'groups', label: 'Groups', icon: Hash },
  { id: 'messages', label: 'Messages', icon: MessagesSquare },
  { id: 'albums', label: 'Albums', icon: Images },
];

const formatDate = (value) => new Date(value).toLocaleString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [tab, setTab] = useState('overview');
  // Set when another tab links here, e.g. "view this group's messages".
  const [messageFilter, setMessageFilter] = useState({});

  const signOut = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  // Every admin call goes through here: an expired session sends the admin back to sign in.
  const request = useCallback(async (path, options = {}) => {
    try {
      return await apiRequest(`/admin${path}`, { ...options, token });
    } catch (error) {
      if (error.status === 401) signOut();
      throw error;
    }
  }, [token, signOut]);

  if (!token) return <Navigate to="/admin/login" replace />;

  const showMessages = (filter) => {
    setMessageFilter(filter);
    setTab('messages');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-gray-950 text-white">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-wide">Chat</span>
            <span className="flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-xs font-medium text-purple-300">
              <Shield className="w-3 h-3" /> Admin
            </span>
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
        <nav className="max-w-6xl mx-auto px-4 sm:px-5 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'messages') setMessageFilter({});
                setTab(id);
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === id ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {tab === 'overview' && <Overview request={request} />}
        {tab === 'users' && <UsersTab request={request} onShowMessages={showMessages} />}
        {tab === 'groups' && <GroupsTab request={request} onShowMessages={showMessages} />}
        {tab === 'messages' && <MessagesTab request={request} initialFilter={messageFilter} />}
        {tab === 'albums' && <AlbumsTab request={request} />}
      </main>
    </div>
  );
}

// Returns `value` once it has stopped changing for `delay` ms, so searches don't fire per keystroke.
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Overview({ request }) {
  const { data, error, loading, reload } = useAdminData(request, '/stats');

  if (!data) return <LoadState loading={loading} error={error} />;
  const { stats } = data;
  const tiles = [
    { label: 'Registered users', value: stats.registeredUsers },
    { label: 'Active guests', value: stats.activeGuests, note: `${stats.totalGuests} guests all time` },
    { label: 'New users (7 days)', value: stats.newUsers7d },
    { label: 'Online now', value: stats.onlineConnections, note: 'open connections' },
    { label: 'Groups', value: stats.groups },
    { label: 'Messages', value: stats.messages },
    { label: 'Messages (24 hours)', value: stats.messages24h },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Overview" onRefresh={reload} loading={loading} />
      {error && <ErrorBox message={error} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-gray-400">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{tile.value.toLocaleString()}</p>
            {tile.note && <p className="mt-0.5 text-xs text-gray-500">{tile.note}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Newest users">
          {data.recentUsers.length === 0 ? <Empty text="No users yet." /> : (
            <ul className="divide-y divide-white/5">
              {data.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={user.displayName} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.displayName} {user.isGuest && <GuestBadge active={user.guestActive} />}</p>
                    <p className="text-xs text-gray-500">{formatDate(user.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Latest messages">
          {data.recentMessages.length === 0 ? <Empty text="No messages yet." /> : (
            <ul className="divide-y divide-white/5">
              {data.recentMessages.map((message) => (
                <li key={message.id} className="py-2.5">
                  <p className="text-xs text-gray-400">
                    <span className="text-gray-200 font-medium">{message.sender.displayName}</span>
                    {message.group && <> in <span className="text-purple-300">#{message.group.name}</span></>}
                    {' · '}{formatDate(message.createdAt)}
                  </p>
                  <p className="text-sm text-gray-200 mt-0.5 line-clamp-2 break-words">{message.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function UsersTab({ request, onShowMessages }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => setPage(1), [debouncedSearch, type]);

  const params = new URLSearchParams({ page, ...(debouncedSearch && { search: debouncedSearch }), ...(type !== 'all' && { type }) });
  const { data, error, loading, reload } = useAdminData(request, `/users?${params}`);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Users" subtitle={data && `${data.total.toLocaleString()} found`} onRefresh={reload} loading={loading} />
      <div className="flex flex-col sm:flex-row gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search username, guest name or email" />
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${INPUT_CLASS} sm:w-44 focus:outline-none focus:ring-2 focus:ring-purple-600`}>
          <option value="all" className="bg-gray-900">All users</option>
          <option value="registered" className="bg-gray-900">Registered</option>
          <option value="guest" className="bg-gray-900">Guests</option>
        </select>
      </div>
      {error && <ErrorBox message={error} />}

      {!data ? <LoadState loading={loading} /> : data.users.length === 0 ? <Empty text="No users match." /> : (
        <ul className="flex flex-col gap-2">
          {data.users.map((user) => (
            <li key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar name={user.displayName} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName} {user.isGuest && <GuestBadge active={user.guestActive} />}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[user.email, user.gender && user.gender[0].toUpperCase() + user.gender.slice(1), user.age && `${user.age} yrs`].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                  <p className="text-xs text-gray-500">Joined {formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <button
                  onClick={() => onShowMessages({ senderId: user.id, label: user.displayName })}
                  disabled={user.messageCount === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {user.messageCount.toLocaleString()} message{user.messageCount === 1 ? '' : 's'}
                </button>
                <DeleteButton onClick={() => setDeleting(user)} label={`Delete ${user.displayName}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {deleting && (
        <DeleteUserDialog
          user={deleting}
          request={request}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function DeleteUserDialog({ user, request, onClose, onDeleted }) {
  const [withMessages, setWithMessages] = useState(false);

  return (
    <ConfirmDialog
      title={`Delete ${user.displayName}?`}
      confirmLabel="Delete user"
      onClose={onClose}
      onConfirm={async () => {
        await request(`/users/${user.id}${withMessages ? '?withMessages=1' : ''}`, { method: 'DELETE' });
        onDeleted();
      }}
    >
      <p>Their account is removed and they are signed out everywhere. This can&apos;t be undone.</p>
      {user.messageCount > 0 && (
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={withMessages} onChange={(e) => setWithMessages(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-500" />
          <span>
            Also delete their {user.messageCount.toLocaleString()} message{user.messageCount === 1 ? '' : 's'}
            <span className="block text-xs text-gray-500">Otherwise they stay and show as &quot;Deleted user&quot;.</span>
          </span>
        </label>
      )}
    </ConfirmDialog>
  );
}

function GroupsTab({ request, onShowMessages }) {
  const { data, error, loading, reload } = useAdminData(request, '/groups');
  const [deleting, setDeleting] = useState(null);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Groups" subtitle={data && `${data.groups.length} group${data.groups.length === 1 ? '' : 's'}`} onRefresh={reload} loading={loading} />
      {error && <ErrorBox message={error} />}

      {!data ? <LoadState loading={loading} /> : data.groups.length === 0 ? <Empty text="No groups yet." /> : (
        <ul className="flex flex-col gap-2">
          {data.groups.map((group) => (
            <li key={group.id} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-purple-300">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{group.name}</p>
                  {group.description && <p className="text-xs text-gray-400 truncate">{group.description}</p>}
                  <p className="text-xs text-gray-500">
                    Created {formatDate(group.createdAt)}{group.createdBy && ` by ${group.createdBy}`}
                    {group.lastMessageAt && ` · last message ${formatDate(group.lastMessageAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <button
                  onClick={() => onShowMessages({ groupId: group.id, label: `#${group.name}` })}
                  disabled={group.messageCount === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {group.messageCount.toLocaleString()} message{group.messageCount === 1 ? '' : 's'}
                </button>
                <DeleteButton onClick={() => setDeleting(group)} label={`Delete ${group.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete #${deleting.name}?`}
          confirmLabel="Delete group"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await request(`/groups/${deleting.id}`, { method: 'DELETE' });
            setDeleting(null);
            reload();
          }}
        >
          <p>
            The group and all {deleting.messageCount.toLocaleString()} of its messages are deleted for everyone. People
            viewing it are moved out. This can&apos;t be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function MessagesTab({ request, initialFilter }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => setPage(1), [debouncedSearch, filter]);

  const params = new URLSearchParams({
    page,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filter.groupId && { groupId: filter.groupId }),
    ...(filter.senderId && { senderId: filter.senderId }),
  });
  const { data, error, loading, reload } = useAdminData(request, `/messages?${params}`);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Messages" subtitle={data && `${data.total.toLocaleString()} found`} onRefresh={reload} loading={loading} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search message text" />
        {filter.label && (
          <span className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-purple-500/15 border border-purple-500/30 pl-3 pr-1.5 py-1 text-xs text-purple-200">
            {filter.label}
            <button onClick={() => setFilter({})} aria-label="Clear filter" className="p-0.5 rounded-full hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>
      {error && <ErrorBox message={error} />}

      {!data ? <LoadState loading={loading} /> : data.messages.length === 0 ? <Empty text="No messages match." /> : (
        <ul className="flex flex-col gap-2">
          {data.messages.map((message) => (
            <li key={message.id} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex items-start gap-3">
              <Avatar name={message.sender.displayName} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">
                  <span className="text-gray-200 font-medium">{message.sender.displayName}</span>
                  {message.sender.isGuest && <> <GuestBadge /></>}
                  {message.group && <> in <span className="text-purple-300">#{message.group.name}</span></>}
                  {' · '}{formatDate(message.createdAt)}
                </p>
                <p className="mt-1 text-sm text-gray-100 whitespace-pre-wrap break-words">{message.text}</p>
              </div>
              <DeleteButton onClick={() => setDeleting(message)} label="Delete message" />
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {deleting && (
        <ConfirmDialog
          title="Delete this message?"
          confirmLabel="Delete message"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await request(`/messages/${deleting.id}`, { method: 'DELETE' });
            setDeleting(null);
            reload();
          }}
        >
          <p className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-gray-200 line-clamp-4 break-words">{deleting.text}</p>
          <p className="mt-3">It disappears for everyone, including people viewing the group right now.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLASS} pl-9 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600`}
      />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const button = 'p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={button}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      Page {page} of {totalPages}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={button}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Avatar({ name }) {
  return (
    <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-sm font-semibold">
      {initialOf(name)}
    </span>
  );
}

function GuestBadge({ active }) {
  return (
    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium align-middle ${active ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-gray-400'}`}>
      {active ? 'Guest · active' : 'Guest'}
    </span>
  );
}

