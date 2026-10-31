import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Images, Loader2, Pencil,
  Plus, RotateCcw, Trash2, UploadCloud, X,
} from 'lucide-react';
import { INPUT_CLASS } from './AuthLayout';
import { ConfirmDialog, DeleteButton, Empty, ErrorBox, LoadState, SectionHeader, useAdminData } from './AdminUI';

// Photos upload from the browser straight to the upload host (Truth Social's media API, as on
// the /uploadtest2 page); only the resulting links are saved through the admin API.
const PARALLEL_UPLOADS = 3;

// Any number of albums, each with its own photos. The list and every album view can
// create another one.
export default function AlbumsTab({ request }) {
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      {openAlbumId
        // key: switching albums starts a fresh view (and uploader) for the new one.
        ? <AlbumView key={openAlbumId} request={request} albumId={openAlbumId} onOpen={setOpenAlbumId} onCreate={() => setCreating(true)} onBack={() => setOpenAlbumId(null)} />
        : <AlbumList request={request} onOpen={setOpenAlbumId} onCreate={() => setCreating(true)} />}

      {creating && (
        <NameDialog
          title="New album"
          submitLabel="Create album"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            const { album } = await request('/albums', { method: 'POST', body: { name } });
            setCreating(false);
            setOpenAlbumId(album.id);
          }}
        />
      )}
    </>
  );
}

function NewAlbumButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors whitespace-nowrap">
      <Plus className="w-4 h-4" /> New album
    </button>
  );
}

// Tabs for every album at the top of an album, so switching or adding one is a click away.
function AlbumSwitcher({ request, currentId, onOpen, onCreate }) {
  const { data } = useAdminData(request, '/albums');
  if (!data) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {data.albums.map((album) => (
        <button
          key={album.id}
          onClick={() => onOpen(album.id)}
          className={`flex items-center gap-2 shrink-0 rounded-full border pl-1 pr-3 py-1 text-sm transition-colors ${
            album.id === currentId ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <span className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            {album.coverUrl ? <img src={album.coverUrl} alt="" className="w-full h-full object-cover" /> : <Images className="w-3 h-3 text-gray-500" />}
          </span>
          <span className="max-w-[10rem] truncate">{album.name}</span>
        </button>
      ))}
      <button onClick={onCreate} className="flex items-center gap-1 shrink-0 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-purple-300 hover:bg-white/5">
        <Plus className="w-3.5 h-3.5" /> New album
      </button>
    </div>
  );
}

function AlbumList({ request, onOpen, onCreate }) {
  const { data, error, loading, reload } = useAdminData(request, '/albums');

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Albums" subtitle={data && `${data.albums.length} album${data.albums.length === 1 ? '' : 's'}`} onRefresh={reload} loading={loading}>
        <NewAlbumButton onClick={onCreate} />
      </SectionHeader>
      {error && <ErrorBox message={error} />}

      {!data ? <LoadState loading={loading} /> : data.albums.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Images className="w-10 h-10 text-gray-600" />
          <p className="text-sm text-gray-400">No albums yet. Create as many as you like, each with its own photos.</p>
          <NewAlbumButton onClick={onCreate} />
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.albums.map((album) => (
            <li key={album.id}>
              <button onClick={() => onOpen(album.id)} className="group w-full text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-colors">
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center overflow-hidden">
                  {album.coverUrl
                    ? <img src={album.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <Images className="w-8 h-8 text-gray-600" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{album.name}</p>
                  <p className="text-xs text-gray-400">{album.photoCount.toLocaleString()} photo{album.photoCount === 1 ? '' : 's'}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlbumView({ request, albumId, onOpen, onCreate, onBack }) {
  const { data, setData, error, loading, reload } = useAdminData(request, `/albums/${albumId}/photos`);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewIndex, setViewIndex] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  // New uploads appear in the grid as soon as their links are saved.
  const addPhotos = useCallback((photos) => {
    setData((current) => (current ? { ...current, photos: [...current.photos, ...photos] } : current));
  }, [setData]);

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={onBack} />
        <LoadState loading={loading} error={error} />
      </div>
    );
  }

  const { album, photos } = data;
  const removePhoto = (id) => setData((current) => ({ ...current, photos: current.photos.filter((p) => p.id !== id) }));

  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={onBack} />
      <AlbumSwitcher request={request} currentId={albumId} onOpen={onOpen} onCreate={onCreate} />
      <SectionHeader title={album.name} subtitle={`${photos.length.toLocaleString()} photo${photos.length === 1 ? '' : 's'}`} onRefresh={reload} loading={loading}>
        <button onClick={() => setRenaming(true)} aria-label="Rename album" title="Rename album" className="p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <DeleteButton onClick={() => setDeleting(true)} label="Delete album" />
      </SectionHeader>
      {error && <ErrorBox message={error} />}

      <Uploader request={request} albumId={albumId} onSaved={addPhotos} />

      {photos.length === 0 ? <Empty text="No photos in this album yet." /> : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="group relative">
              <button onClick={() => setViewIndex(index)} className="block w-full aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors">
                <img src={photo.previewUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
              </button>
              {/* Always visible on touch screens (no hover); appears on hover elsewhere. */}
              <button
                onClick={() => setDeletingPhoto(photo)}
                aria-label="Delete photo"
                title="Delete photo"
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-red-300 hover:bg-red-600 hover:text-white transition-all [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewIndex !== null && photos[viewIndex] && (
        <Lightbox
          photos={photos}
          index={viewIndex}
          onIndexChange={setViewIndex}
          onClose={() => setViewIndex(null)}
          onDelete={async (photo) => {
            await request(`/albums/${albumId}/photos/${photo.id}`, { method: 'DELETE' });
            removePhoto(photo.id);
            // Stay on the same position, which now shows the next photo (or the new last one).
            setViewIndex((i) => (photos.length <= 1 ? null : Math.min(i, photos.length - 2)));
          }}
        />
      )}

      {deletingPhoto && (
        <ConfirmDialog
          title="Delete this photo?"
          confirmLabel="Delete photo"
          onClose={() => setDeletingPhoto(null)}
          onConfirm={async () => {
            await request(`/albums/${albumId}/photos/${deletingPhoto.id}`, { method: 'DELETE' });
            removePhoto(deletingPhoto.id);
            setDeletingPhoto(null);
          }}
        >
          <img src={deletingPhoto.previewUrl} alt="" className="w-24 h-24 rounded-lg object-cover border border-white/10" />
          <p className="mt-3">It&apos;s removed from this album and the database. The file itself stays on the CDN.</p>
        </ConfirmDialog>
      )}

      {renaming && (
        <NameDialog
          title="Rename album"
          submitLabel="Save"
          initialName={album.name}
          onClose={() => setRenaming(false)}
          onSubmit={async (name) => {
            const { album: updated } = await request(`/albums/${albumId}`, { method: 'PATCH', body: { name } });
            setData((current) => ({ ...current, album: { ...current.album, name: updated.name } }));
            setRenaming(false);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${album.name}"?`}
          confirmLabel="Delete album"
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await request(`/albums/${albumId}`, { method: 'DELETE' });
            onBack();
          }}
        >
          <p>The album and its {photos.length.toLocaleString()} photo link{photos.length === 1 ? '' : 's'} are removed from the dashboard. This can&apos;t be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// Uploads one file to the upload host, reporting progress (0–100). Resolves with the links to save.
function uploadToHost(file, { endpoint, token }, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON error page; handled below.
      }
      if ((xhr.status === 200 || xhr.status === 202) && data.url) {
        resolve({
          url: data.url,
          previewUrl: data.preview_url || undefined,
          width: data.meta?.original?.width,
          height: data.meta?.original?.height,
        });
      } else {
        reject(new Error(data.error || `Upload failed (${xhr.status || 'no response'})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.send(formData);
  });
}

let nextItemId = 0;

function Uploader({ request, albumId, onSaved }) {
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const queueRef = useRef([]);
  const activeRef = useRef(0);
  const configRef = useRef(null);

  const updateItem = (id, patch) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadItem = async (item) => {
    try {
      // Fetched once per album view and shared by every upload; forgotten on failure so a retry refetches.
      configRef.current = configRef.current || request('/upload-config').catch((error) => {
        configRef.current = null;
        throw error;
      });
      const config = await configRef.current;
      updateItem(item.id, { status: 'uploading', progress: 0, error: '' });
      const photo = await uploadToHost(item.file, config, (progress) => updateItem(item.id, { progress }));
      updateItem(item.id, { status: 'saving', progress: 100 });
      const { photos } = await request(`/albums/${albumId}/photos`, { method: 'POST', body: { photos: [photo] } });
      onSaved(photos);
      updateItem(item.id, { status: 'done' });
    } catch (error) {
      updateItem(item.id, { status: 'error', error: error.message });
    }
  };

  // Keeps up to PARALLEL_UPLOADS uploads running until the queue is empty.
  const pump = () => {
    while (activeRef.current < PARALLEL_UPLOADS && queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      activeRef.current += 1;
      uploadItem(item).finally(() => {
        activeRef.current -= 1;
        pump();
      });
    }
  };

  const addFiles = (fileList) => {
    const files = [...fileList];
    const images = files.filter((file) => file.type.startsWith('image/'));
    setNotice(images.length < files.length ? `${files.length - images.length} file(s) skipped: only photos can be added.` : '');
    if (images.length === 0) return;

    const newItems = images.map((file) => ({ id: nextItemId++, file, name: file.name, status: 'waiting', progress: 0, error: '' }));
    setItems((current) => [...current, ...newItems]);
    queueRef.current.push(...newItems);
    pump();
  };

  const retry = (item) => {
    updateItem(item.id, { status: 'waiting', progress: 0, error: '' });
    queueRef.current.push(item);
    pump();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    // dragleave also fires when moving over child elements, so ignore those.
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const finished = items.filter((i) => i.status === 'done').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const busy = items.some((i) => ['waiting', 'uploading', 'saving'].includes(i.status));

  return (
    <section className="flex flex-col gap-3">
      <label
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/15 bg-white/[0.03] hover:bg-white/5'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-purple-300" />
        <p className="text-sm text-gray-300"><span className="font-semibold text-white">Click to add photos</span> or drag and drop</p>
        <p className="text-xs text-gray-500">Select as many as you like. PNG, JPG, GIF, WEBP</p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            // Allow picking the same files again later.
            e.target.value = '';
          }}
        />
      </label>
      {notice && <p className="text-xs text-amber-300">{notice}</p>}

      {items.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm text-gray-300">
              {busy && <Loader2 className="inline w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {finished} of {items.length} uploaded{failed > 0 && <span className="text-red-300"> · {failed} failed</span>}
            </p>
            {!busy && (
              <button onClick={() => setItems((current) => current.filter((i) => i.status === 'error'))} className="text-xs text-gray-400 hover:text-white">
                Clear finished
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-xs">
                <StatusIcon status={item.status} />
                <span className="min-w-0 flex-1 truncate text-gray-300" title={item.error || item.name}>
                  {item.name}
                  {item.error && <span className="text-red-300"> · {item.error}</span>}
                </span>
                {item.status === 'uploading' && (
                  <span className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
                    <span className="block h-full bg-purple-500 transition-[width]" style={{ width: `${item.progress}%` }} />
                  </span>
                )}
                {item.status === 'error' && (
                  <button onClick={() => retry(item)} className="flex items-center gap-1 text-purple-300 hover:text-white shrink-0">
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatusIcon({ status }) {
  if (status === 'done') return <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  if (status === 'error') return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (status === 'waiting') return <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />;
  return <Loader2 className="w-3.5 h-3.5 text-purple-300 animate-spin shrink-0" />;
}

function Lightbox({ photos, index, onIndexChange, onClose, onDelete }) {
  const photo = photos[index];
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const go = useCallback((step) => onIndexChange((i) => (i + step + photos.length) % photos.length), [onIndexChange, photos.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (confirming) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose, confirming]);

  const copyLink = () => {
    navigator.clipboard.writeText(photo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconButton = 'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/95" onClick={onClose}>
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-300 tabular-nums">{index + 1} / {photos.length}</p>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className={`${iconButton} flex items-center gap-1.5 text-sm`}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
          </button>
          <a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label="Open original" title="Open original" className={iconButton}>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={() => setConfirming(true)} aria-label="Delete photo" title="Delete photo" className={`${iconButton} text-red-300`}>
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} aria-label="Close" className={iconButton}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-4">
        <img src={photo.url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        {photos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" className={`${iconButton} absolute left-2 sm:left-4 top-1/2 -translate-y-1/2`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" className={`${iconButton} absolute right-2 sm:right-4 top-1/2 -translate-y-1/2`}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {confirming && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Remove this photo?"
            confirmLabel="Remove photo"
            onClose={() => setConfirming(false)}
            onConfirm={async () => {
              await onDelete(photo);
              setConfirming(false);
            }}
          >
            <p>It&apos;s removed from this album and the database. The file itself stays on the CDN.</p>
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
}

function NameDialog({ title, submitLabel, initialName = '', onClose, onSubmit }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={busy ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <label className="block mt-4">
          <span className="text-sm text-gray-300">Album name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Summer meetup 2026"
            required
            className={`mt-1.5 ${INPUT_CLASS} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
        </label>
        {error && <div className="mt-4"><ErrorBox message={error} /></div>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={busy || !name.trim()} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="self-start flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
      <ArrowLeft className="w-4 h-4" /> All albums
    </button>
  );
}
