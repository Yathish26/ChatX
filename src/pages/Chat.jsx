import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, Hash, Loader2, LogOut, MessageCircle, Plus, Send, X } from 'lucide-react';
import { apiRequest } from '../api';
import { useAuth } from '../AuthContext';
import { INPUT_CLASS } from '../components/AuthLayout';
import { displayName, initialOf } from '../components/ProfileFields';

const PAGE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 2000;
// Consecutive messages from one sender within this window are visually grouped.
const GROUPING_WINDOW_MS = 5 * 60 * 1000;
const TYPING_THROTTLE_MS = 2000;
const TYPING_DISPLAY_MS = 3000;

// On phones, auto-focusing the composer would pop the keyboard over the thread on every group switch.
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

const sortByActivity = (groups) => [...groups].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

export default function Chat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, token, signOut, endGuestSession } = useAuth();

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [connected, setConnected] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const socketRef = useRef(null);
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  const activeGroup = groups.find((g) => g.id === groupId);

  // Any 401 means the session is gone (expired, or password changed elsewhere).
  const request = useCallback(async (path, options = {}) => {
    try {
      return await apiRequest(path, { ...options, token });
    } catch (error) {
      if (error.status === 401) signOut();
      throw error;
    }
  }, [token, signOut]);

  useEffect(() => {
    request('/groups')
      .then((data) => setGroups(data.groups))
      .catch((error) => setGroupsError(error.message))
      .finally(() => setGroupsLoading(false));
  }, [request]);

  // On wide screens there's room for the thread, so open the most active group straight away.
  useEffect(() => {
    if (!groupId && groups.length > 0 && window.matchMedia('(min-width: 768px)').matches) {
      navigate(`/chat/${groups[0].id}`, { replace: true });
    }
  }, [groupId, groups, navigate]);

  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_SERVER}/chat`, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Rooms don't survive a reconnect, so rejoin the open group.
      if (groupIdRef.current) socket.emit('group:join', groupIdRef.current);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('message:new', (message) => {
      if (message.groupId !== groupIdRef.current) return;
      // The sender also gets this message from the POST response, so dedupe.
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
      setTypingUsers((current) => {
        const { [message.sender.id]: _removed, ...rest } = current;
        return rest;
      });
    });

    const upsertGroup = (group) => {
      setGroups((current) => sortByActivity([group, ...current.filter((g) => g.id !== group.id)]));
    };
    socket.on('group:created', upsertGroup);
    socket.on('group:updated', upsertGroup);

    // Admin removals.
    socket.on('group:deleted', ({ id }) => {
      setGroups((current) => current.filter((g) => g.id !== id));
      if (groupIdRef.current === id) navigate('/chat', { replace: true });
    });
    socket.on('message:deleted', ({ id }) => {
      setMessages((current) => current.filter((m) => m.id !== id));
    });
    socket.on('messages:removed', ({ senderId }) => {
      setMessages((current) => current.filter((m) => m.sender.id !== senderId));
    });

    socket.on('typing', ({ groupId: typingGroupId, user: typingUser }) => {
      if (typingGroupId !== groupIdRef.current) return;
      setTypingUsers((current) => ({ ...current, [typingUser.id]: { displayName: typingUser.displayName, at: Date.now() } }));
    });

    return () => socket.disconnect();
  }, [token]);

  // Expire stale typing indicators.
  useEffect(() => {
    if (Object.keys(typingUsers).length === 0) return undefined;
    const timer = setInterval(() => {
      const cutoff = Date.now() - TYPING_DISPLAY_MS;
      setTypingUsers((current) => Object.fromEntries(Object.entries(current).filter(([, t]) => t.at > cutoff)));
    }, 1000);
    return () => clearInterval(timer);
  }, [typingUsers]);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setTypingUsers({});
    setThreadError('');
    if (!groupId) return;

    if (socketRef.current?.connected) socketRef.current.emit('group:join', groupId);

    setThreadLoading(true);
    request(`/groups/${groupId}/messages?limit=${PAGE_SIZE}`)
      .then((data) => {
        // Ignore the response if the user has already switched to another group.
        if (groupIdRef.current !== groupId) return;
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch((error) => {
        if (groupIdRef.current === groupId) setThreadError(error.message);
      })
      .finally(() => {
        if (groupIdRef.current === groupId) setThreadLoading(false);
      });
  }, [groupId, request]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const requestedFor = groupId;
    setLoadingOlder(true);
    try {
      const data = await request(`/groups/${groupId}/messages?limit=${PAGE_SIZE}&before=${messages[0].id}`);
      if (groupIdRef.current !== requestedFor) return;
      setMessages((current) => [...data.messages, ...current]);
      setHasMore(data.hasMore);
    } catch (error) {
      setThreadError(error.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (text) => {
    const data = await request(`/groups/${groupId}/messages`, { method: 'POST', body: { text } });
    setMessages((current) => (current.some((m) => m.id === data.message.id) ? current : [...current, data.message]));
  };

  const lastTypingSentRef = useRef(0);
  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    socketRef.current?.emit('typing', groupId);
  };

  const handleGroupCreated = (group) => {
    setGroups((current) => sortByActivity([group, ...current.filter((g) => g.id !== group.id)]));
    setShowNewGroup(false);
    navigate(`/chat/${group.id}`);
  };

  const typingNames = Object.values(typingUsers).map((t) => t.displayName);

  return (
    // dvh, not vh: on mobile 100vh includes the area behind the browser's toolbars,
    // which would push the composer off-screen.
    <div className="h-dvh flex bg-gray-950 text-white overflow-hidden">
      <GroupSidebar
        groups={groups}
        loading={groupsLoading}
        error={groupsError}
        activeGroupId={groupId}
        user={user}
        hiddenOnMobile={Boolean(groupId)}
        onNewGroup={() => setShowNewGroup(true)}
        onEndSession={endGuestSession}
      />

      <section className={`flex-1 min-w-0 flex-col ${groupId ? 'flex' : 'hidden md:flex'}`}>
        {groupId ? (
          <>
            <header className="shrink-0 border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 pt-[max(0.625rem,env(safe-area-inset-top))] flex items-center gap-2 sm:gap-3">
              <Link to="/chat" className="md:hidden -ml-1 p-2 rounded-lg text-gray-300 hover:bg-white/10" aria-label="Back to groups">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-purple-600/20 text-purple-300 flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold truncate">{activeGroup?.name || 'Loading...'}</h1>
                <p className="text-xs text-gray-400 truncate">
                  {typingNames.length > 0
                    ? <span className="text-purple-300">{formatTyping(typingNames)}</span>
                    : activeGroup?.description || 'Group chat'}
                </p>
              </div>
              <ConnectionBadge connected={connected} />
            </header>

            <MessageThread
              key={groupId}
              messages={messages}
              currentUserId={user.id}
              loading={threadLoading}
              loadingOlder={loadingOlder}
              hasMore={hasMore}
              error={threadError}
              onLoadOlder={loadOlder}
            />

            <Composer key={`composer-${groupId}`} onSend={sendMessage} onTyping={notifyTyping} groupName={activeGroup?.name} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="w-12 h-12 text-gray-600" />
            <p className="mt-4 text-gray-400">Select a group to start chatting</p>
          </div>
        )}
      </section>

      {showNewGroup && (
        <NewGroupDialog request={request} onCancel={() => setShowNewGroup(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}

function GroupSidebar({ groups, loading, error, activeGroupId, user, hiddenOnMobile, onNewGroup, onEndSession }) {
  return (
    <aside className={`w-full md:w-80 shrink-0 flex-col border-r border-white/10 bg-gray-900/60 ${hiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
      <div className="shrink-0 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-wide">Chat</span>
        </Link>
        <button
          onClick={onNewGroup}
          className="p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="New group"
          title="New group"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-400">{error}</p>
        ) : (
          <ul className="py-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/chat/${group.id}`}
                  className={`mx-2 flex items-center gap-3 rounded-lg px-3 py-3 md:py-2.5 transition-colors ${
                    group.id === activeGroupId ? 'bg-purple-600/20' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-semibold text-purple-300">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm font-medium ${group.id === activeGroupId ? 'text-purple-200' : 'text-white'}`}>{group.name}</p>
                      {group.lastMessage && (
                        <span className="shrink-0 text-[10px] text-gray-500">{formatShortTime(group.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-400">
                      {group.lastMessage ? `${group.lastMessage.senderName}: ${group.lastMessage.text}` : 'No messages yet'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Guests have no profile to open, so they get an "End session" button instead. */}
      {user.isGuest ? (
        <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <Avatar name={displayName(user)} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{displayName(user)}</p>
            <p className="text-xs text-gray-400 truncate">Guest session</p>
          </div>
          <button
            onClick={onEndSession}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            End session
          </button>
        </div>
      ) : (
        <Link to="/profile" className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 hover:bg-white/5 transition-colors">
          <Avatar name={displayName(user)} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName(user)}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </Link>
      )}
    </aside>
  );
}

function MessageThread({ messages, currentUserId, loading, loadingOlder, hasMore, error, onLoadOlder }) {
  const containerRef = useRef(null);
  const prevRef = useRef({ firstId: null, lastId: null, scrollHeight: 0, nearBottom: true });

  // Decide scroll position after each render: jump to bottom on first load or when a new
  // message arrives while the user is already near the bottom (or sent it themselves);
  // keep the viewport steady when older messages are prepended.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prev = prevRef.current;
    const first = messages[0];
    const last = messages[messages.length - 1];

    if (first && prev.firstId && first.id !== prev.firstId && last?.id === prev.lastId) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight;
    } else if (last && last.id !== prev.lastId) {
      const isFirstLoad = !prev.lastId;
      const ownMessage = last.sender.id === currentUserId;
      if (isFirstLoad || prev.nearBottom || ownMessage) {
        el.scrollTop = el.scrollHeight;
      }
    }

    prevRef.current = {
      firstId: first?.id || null,
      lastId: last?.id || null,
      scrollHeight: el.scrollHeight,
      nearBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 120,
    };
  }, [messages, currentUserId]);

  const handleScroll = () => {
    const el = containerRef.current;
    prevRef.current.nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    prevRef.current.scrollHeight = el.scrollHeight;
    if (el.scrollTop < 80 && hasMore && !loadingOlder) onLoadOlder();
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>;
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4">
      {loadingOlder && <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div>}
      {!hasMore && messages.length > 0 && (
        <p className="text-center text-xs text-gray-500 py-3">This is the start of the conversation</p>
      )}
      {error && <p className="text-center text-sm text-red-400 py-3">{error}</p>}

      {messages.length === 0 && !error ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <p className="text-gray-400">No messages yet.</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to say hello 👋</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {messages.map((message, i) => {
            const prev = messages[i - 1];
            const showDate = !prev || !sameDay(prev.createdAt, message.createdAt);
            const startsRun = showDate || prev.sender.id !== message.sender.id
              || new Date(message.createdAt) - new Date(prev.createdAt) > GROUPING_WINDOW_MS;
            return (
              <div key={message.id}>
                {showDate && <DateDivider date={message.createdAt} />}
                <MessageBubble message={message} own={message.sender.id === currentUserId} startsRun={startsRun} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, own, startsRun }) {
  return (
    <div className={`flex gap-2 sm:gap-3 ${own ? 'flex-row-reverse' : ''} ${startsRun ? 'mt-4' : 'mt-0.5'}`}>
      {/* Own messages need no avatar column; dropping it gives phones more room. */}
      {!own && (
        <div className="w-8 shrink-0">
          {startsRun && <Avatar name={message.sender.displayName} />}
        </div>
      )}
      <div className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[75%] ${own ? 'items-end' : 'items-start'}`}>
        {startsRun && (
          <div className={`flex items-baseline gap-2 mb-1 ${own ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-medium text-gray-200">{own ? 'You' : message.sender.displayName}</span>
            {!own && message.sender.isGuest && (
              <span className="rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide bg-white/10 text-gray-400">Guest</span>
            )}
            <span className="text-[10px] text-gray-500">{formatTime(message.createdAt)}</span>
          </div>
        )}
        <div
          title={new Date(message.createdAt).toLocaleString()}
          className={`max-w-full px-3.5 py-2 text-[15px] sm:text-sm whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl ${
            own ? 'bg-purple-600 text-white rounded-tr-md' : 'bg-white/10 text-gray-100 rounded-tl-md'
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function Composer({ onSend, onTyping, groupName }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  // Grow with the content up to a max height, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError('');
    try {
      await onSend(trimmed);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter inserts a newline. (The textarea is text-base on
    // phones because iOS zooms into inputs smaller than 16px.)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t border-white/10 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <div className="flex items-end gap-2 rounded-2xl sm:rounded-xl border border-white/10 bg-white/5 pl-3.5 pr-1.5 sm:px-3 py-1.5 sm:py-2 focus-within:ring-2 focus-within:ring-purple-600">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTyping();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={groupName ? `Message #${groupName}` : 'Write a message'}
          className="flex-1 min-w-0 resize-none bg-transparent py-1.5 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none"
          autoFocus={!isTouchDevice()}
          enterKeyHint="send"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          className="shrink-0 p-2.5 sm:p-2 rounded-full sm:rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-500 hidden sm:block">Enter to send · Shift + Enter for a new line</p>
    </div>
  );
}

function NewGroupDialog({ request, onCancel, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await request('/groups', { method: 'POST', body: { name, description } });
      onCreated(data.group);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    // Bottom sheet on phones (easier to reach), centred dialog from sm up.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="new-group-title" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-900 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="new-group-title" className="text-lg font-semibold">New group</h2>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-md text-gray-400 hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{error}</p>}
        <label className="block mt-4">
          <span className="text-sm text-gray-300">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            autoFocus
            placeholder="e.g. Design team"
            className={`mt-1.5 ${INPUT_CLASS} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
        </label>
        <label className="block mt-4">
          <span className="text-sm text-gray-300">Description <span className="text-gray-500">(optional)</span></span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="What's this group about?"
            className={`mt-1.5 ${INPUT_CLASS} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
        </label>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-3 sm:py-2 text-sm font-medium text-gray-300 hover:bg-white/10">
            Cancel
          </button>
          <button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-purple-600 px-4 py-3 sm:py-2 text-sm font-medium hover:bg-purple-500 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create group'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConnectionBadge({ connected }) {
  return (
    // Just the dot on phones; the label needs room the header doesn't have.
    <span
      title={connected ? 'Live' : 'Connecting...'}
      className={`shrink-0 flex items-center gap-1.5 px-1 text-xs ${connected ? 'text-green-400' : 'text-amber-400'}`}
    >
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
      <span className="hidden sm:inline">{connected ? 'Live' : 'Connecting...'}</span>
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-sm font-semibold">
      {initialOf(name)}
    </div>
  );
}

function DateDivider({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] text-gray-500">{formatDay(date)}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function formatTyping(names) {
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return 'Several people are typing...';
}

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDay(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShortTime(date) {
  const d = new Date(date);
  return d.toDateString() === new Date().toDateString()
    ? formatTime(d)
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
