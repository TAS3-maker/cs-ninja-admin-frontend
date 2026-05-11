import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Send, RefreshCw, Search, Image as ImageIcon, Loader2, X, CheckCircle2, Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getStoredUser } from '../api';

/*
 * Doubts inbox — chat-style two-pane layout:
 *   • Left  : list (search + status filter)
 *   • Right : conversation thread + reply box (text + image)
 */
export default function Doubts() {
  const me = getStoredUser();
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const docs = await api.listDoubts();
      setList(docs);
      // keep selected after refresh; otherwise pick first
      if (docs.length && (!selectedId || !docs.find((d) => d.id === selectedId))) {
        setSelectedId(docs.find((d) => d.status === 'pending')?.id || docs[0].id);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load doubts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    return list.filter((d) => {
      if (filter !== 'all' && d.status !== filter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (d.user_name || '').toLowerCase().includes(q)
        || (d.question || '').toLowerCase().includes(q)
        || (d.topic || '').toLowerCase().includes(q)
        || (d.course_id || '').toLowerCase().includes(q);
    });
  }, [list, filter, search]);

  const selected = list.find((d) => d.id === selectedId) || null;

  const onReplied = (updated: any) => {
    setList((cur) => cur.map((d) => d.id === updated.id ? updated : d));
  };

  return (
    // <div className="flex flex-col h-full overflow-hidden bg-slate-50" style={{ height: 'calc(100vh - 0px)' }}>
    //   <div className="px-6 pt-5 pb-3 border-b border-slate-200 bg-white">
    //     <div className="flex items-center justify-between gap-3">
    //       <div>
    //         <h1 className="text-xl font-bold text-slate-900">Doubts Inbox</h1>
    //         <p className="text-xs text-slate-500 mt-0.5">Reply to student questions in real-time. Tap a thread to chat.</p>
    //       </div>
    //       <button className="btn-outline" onClick={load} disabled={loading}>
    //         {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
    //       </button>
    //     </div>
    //   </div>

    //   <div className="flex-1 flex overflow-hidden">
    //     {/* LEFT : list */}
    //     <aside className="w-[320px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
    //       <div className="px-3 py-3 border-b border-slate-200 space-y-2">
    //         <div className="relative">
    //           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    //           <input
    //             value={search}
    //             onChange={(e) => setSearch(e.target.value)}
    //             placeholder="Search question, student, topic…"
    //             className="input !pl-9 text-sm"
    //           />
    //         </div>
    //         <div className="flex gap-1">
    //           {(['pending', 'answered', 'all'] as const).map((f) => {
    //             const count = list.filter((d) => f === 'all' || d.status === f).length;
    //             return (
    //               <button
    //                 key={f}
    //                 onClick={() => setFilter(f)}
    //                 className={`flex-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded ${
    //                   filter === f ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    //                 }`}>
    //                 {f} <span className="opacity-70">({count})</span>
    //               </button>
    //             );
    //           })}
    //         </div>
    //       </div>
    //       <div className="flex-1 overflow-y-auto">
    //         {filtered.length === 0 && (
    //           <div className="p-8 text-center text-sm text-slate-400">
    //             <MessageCircle className="mx-auto text-slate-300 mb-2" size={28} />
    //             No {filter !== 'all' ? filter : ''} doubts
    //           </div>
    //         )}
    //         {filtered.map((d) => (
    //           <ListRow key={d.id} d={d} active={d.id === selectedId} onClick={() => setSelectedId(d.id)} />
    //         ))}
    //       </div>
    //     </aside>

    //     {/* RIGHT : conversation */}
    //     <main className="flex-1 flex flex-col overflow-hidden">
    //       {selected ? (
    //         <Conversation me={me} doubt={selected} onReplied={onReplied} />
    //       ) : (
    //         <div className="flex-1 flex items-center justify-center text-slate-400">
    //           <div className="text-center">
    //             <MessageCircle className="mx-auto text-slate-300 mb-3" size={48} />
    //             <div className="text-sm">Select a doubt to start chatting</div>
    //           </div>
    //         </div>
    //       )}
    //     </main>
    //   </div>
    // </div>

    <div
  className="flex flex-col h-full overflow-hidden bg-slate-50"
  style={{ height: 'calc(100vh - 0px)' }}
>

  {/* HEADER */}
  <div className="px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 pb-3 border-b border-slate-200 bg-white">

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">
          Doubts Inbox
        </h1>

        <p className="text-xs text-slate-500 mt-0.5">
          Reply to student questions in real-time. Tap a thread to chat.
        </p>
      </div>

      <button
        className="btn-outline w-full sm:w-auto justify-center"
        onClick={load}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}

        Refresh
      </button>
    </div>
  </div>

  {/* BODY */}
  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

    {/* LEFT SIDEBAR */}
    <aside
      className="
        w-full
        md:w-[320px]
        md:flex-shrink-0
        border-b md:border-b-0 md:border-r
        border-slate-200
        bg-white
        flex
        flex-col
        max-h-[320px]
        md:max-h-full
      "
    >

      {/* SEARCH + FILTER */}
      <div className="px-3 py-3 border-b border-slate-200 space-y-2">

        {/* SEARCH */}
        <div className="relative">

          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question, student, topic…"
            className="input !pl-9 text-sm"
          />
        </div>

        {/* FILTERS */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">

          {(['pending', 'answered', 'all'] as const).map((f) => {

            const count = list.filter(
              (d) => f === 'all' || d.status === f
            ).length;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 whitespace-nowrap text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded ${
                  filter === f
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}

                <span className="opacity-70">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto">

        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">

            <MessageCircle
              className="mx-auto text-slate-300 mb-2"
              size={28}
            />

            No {filter !== 'all' ? filter : ''} doubts
          </div>
        )}

        {filtered.map((d) => (
          <ListRow
            key={d.id}
            d={d}
            active={d.id === selectedId}
            onClick={() => setSelectedId(d.id)}
          />
        ))}
      </div>
    </aside>

    {/* RIGHT CHAT SECTION */}
    <main className="flex-1 flex flex-col overflow-hidden min-h-0">

      {selected ? (
        <Conversation
          me={me}
          doubt={selected}
          onReplied={onReplied}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 p-6">

          <div className="text-center">

            <MessageCircle
              className="mx-auto text-slate-300 mb-3"
              size={48}
            />

            <div className="text-sm">
              Select a doubt to start chatting
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
</div>
  );
}

/* ─── List row ──────────────────────────────────────────────────────────── */
function ListRow({ d, active, onClick }: { d: any; active: boolean; onClick: () => void }) {
  const last = (d.replies || [])[(d.replies || []).length - 1];
  const lastPreview = last
    ? `${last.by_role === 'student' ? '' : '↳ '}${last.content || (last.image_url ? '📷 Image' : '')}`
    : d.question;
  const initials = (d.user_name || '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    // <button
    //   onClick={onClick}
    //   className={`w-full text-left px-3 py-3 border-b border-slate-100 flex items-start gap-3 transition-colors ${
    //     active ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
    //   }`}>
    //   <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
    //     {initials}
    //   </div>
    //   <div className="flex-1 min-w-0">
    //     <div className="flex items-center gap-2">
    //       <div className="font-semibold text-sm text-slate-900 truncate flex-1">{d.user_name || 'Student'}</div>
    //       {d.status === 'answered'
    //         ? <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
    //         : <Circle size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
    //     </div>
    //     <div className="text-[11px] text-slate-500 mt-0.5 truncate">{d.course_id}{d.topic ? ` · ${d.topic}` : ''}</div>
    //     <div className="text-xs text-slate-600 mt-1 line-clamp-2">{lastPreview}</div>
    //     <div className="text-[10px] text-slate-400 mt-1">{d.createdAt ? new Date(d.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</div>
    //   </div>
    // </button>

    <button
  onClick={onClick}
  className={`w-full text-left px-3 sm:px-4 py-3 border-b border-slate-100 flex items-start gap-3 transition-colors ${
    active
      ? 'bg-brand-50 border-l-4 border-l-brand-500'
      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
  }`}
>

  {/* AVATAR */}
  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">

    {initials}
  </div>

  {/* CONTENT */}
  <div className="flex-1 min-w-0">

    {/* TOP ROW */}
    <div className="flex items-start gap-2">

      <div className="font-semibold text-sm sm:text-[15px] text-slate-900 truncate flex-1">

        {d.user_name || 'Student'}
      </div>

      {d.status === 'answered' ? (
        <CheckCircle2
          size={14}
          className="text-emerald-500 flex-shrink-0 mt-0.5"
        />
      ) : (
        <Circle
          size={11}
          className="text-amber-500 fill-amber-500 flex-shrink-0 mt-1"
        />
      )}
    </div>

    {/* COURSE + TOPIC */}
    <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 break-words">

      {d.course_id}

      {d.topic ? ` · ${d.topic}` : ''}
    </div>

    {/* PREVIEW */}
    <div className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 break-words">

      {lastPreview}
    </div>

    {/* DATE */}
    <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">

      {d.createdAt
        ? new Date(d.createdAt).toLocaleString([], {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : ''}
    </div>
  </div>
</button>
  );
}

/* ─── Conversation pane ─────────────────────────────────────────────────── */
function Conversation({ me, doubt, onReplied }: { me: any; doubt: any; onReplied: (d: any) => void }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build the message timeline: question first (from student), then replies in order.
  const messages = [
    {
      key: 'q',
      from: 'student' as const,
      author: doubt.user_name || 'Student',
      content: doubt.question,
      image_url: null,
      at: doubt.createdAt,
    },
    ...((doubt.replies || []).map((r: any, i: number) => ({
      key: `r_${i}`,
      from: r.by_role === 'student' ? 'student' as const : 'staff' as const,
      author: r.by || 'Staff',
      content: r.content || '',
      image_url: r.image_url || null,
      at: r.at,
    }))),
  ];

  useEffect(() => {
    // auto-scroll to bottom on new messages or doubt change
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [doubt.id, messages.length]);

  const onPickImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await api.uploadFile(file, 'doubt');
      setImageUrl(url);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const send = async () => {
    if (sending) return;
    if (!text.trim() && !imageUrl) return;
    setSending(true);
    try {
      const updated = await api.replyDoubt(doubt.id, { content: text.trim(), image_url: imageUrl || undefined });
      onReplied(updated);
      setText('');
      setImageUrl(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Send failed');
    } finally { setSending(false); }
  };

  return (
    // <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
    //   {/* Header */}
    //   <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
    //     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold">
    //       {(doubt.user_name || '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
    //     </div>
    //     <div className="flex-1 min-w-0">
    //       <div className="font-bold text-slate-900 truncate">{doubt.user_name || 'Student'}</div>
    //       <div className="text-[11px] text-slate-500">
    //         {doubt.course_id}{doubt.topic ? ` · ${doubt.topic}` : ''} · {doubt.status === 'answered' ? 'Answered' : 'Pending reply'}
    //       </div>
    //     </div>
    //   </div>

    //   {/* Messages */}
    //   <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
    //     {messages.map((m) => (
    //       <Bubble key={m.key} m={m} mine={m.from !== 'student'} />
    //     ))}
    //   </div>

    //   {/* Composer */}
    //   <div className="border-t border-slate-200 bg-white px-3 py-3">
    //     {imageUrl && (
    //       <div className="mb-2 inline-flex items-start gap-2 bg-slate-100 rounded-lg p-2 max-w-xs">
    //         <img src={imageUrl} alt="attachment preview" className="w-20 h-20 rounded object-cover" />
    //         <button onClick={() => setImageUrl(null)} className="text-slate-500 hover:text-red-600" aria-label="Remove attachment"><X size={16} /></button>
    //       </div>
    //     )}
    //     <div className="flex items-end gap-2">
    //       <input
    //         ref={fileRef}
    //         type="file"
    //         accept="image/*"
    //         className="hidden"
    //         onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.currentTarget.value = ''; }}
    //       />
    //       <button
    //         type="button"
    //         disabled={uploading}
    //         onClick={() => fileRef.current?.click()}
    //         title="Attach image"
    //         className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50">
    //         {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
    //       </button>
    //       <textarea
    //         value={text}
    //         onChange={(e) => setText(e.target.value)}
    //         onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
    //         placeholder={`Reply as ${me?.name || 'Faculty'}…  (Enter to send · Shift+Enter for newline)`}
    //         rows={1}
    //         className="input flex-1 resize-none max-h-32 leading-tight"
    //       />
    //       <button
    //         disabled={sending || (!text.trim() && !imageUrl)}
    //         onClick={send}
    //         className="btn-primary disabled:opacity-50">
    //         {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
    //       </button>
    //     </div>
    //   </div>
    // </div>

    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

  {/* HEADER */}
  <div className="px-3 sm:px-4 md:px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-3">

    {/* AVATAR */}
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">

      {(doubt.user_name || '?')
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </div>

    {/* USER INFO */}
    <div className="flex-1 min-w-0">

      <div className="font-bold text-sm sm:text-base text-slate-900 truncate">

        {doubt.user_name || 'Student'}
      </div>

      <div className="text-[10px] sm:text-[11px] text-slate-500 break-words">

        {doubt.course_id}

        {doubt.topic ? ` · ${doubt.topic}` : ''}

        {' · '}

        {doubt.status === 'answered'
          ? 'Answered'
          : 'Pending reply'}
      </div>
    </div>
  </div>

  {/* MESSAGES */}
  <div
    ref={scrollRef}
    className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-5 py-4 space-y-3"
  >

    {messages.map((m) => (
      <Bubble
        key={m.key}
        m={m}
        mine={m.from !== 'student'}
      />
    ))}
  </div>

  {/* COMPOSER */}
  <div className="border-t border-slate-200 bg-white px-3 py-3">

    {/* IMAGE PREVIEW */}
    {imageUrl && (

      <div className="mb-2 inline-flex items-start gap-2 bg-slate-100 rounded-lg p-2 max-w-full sm:max-w-xs">

        <img
          src={imageUrl}
          alt="attachment preview"
          className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover shrink-0"
        />

        <button
          onClick={() => setImageUrl(null)}
          className="text-slate-500 hover:text-red-600 shrink-0"
          aria-label="Remove attachment"
        >
          <X size={16} />
        </button>
      </div>
    )}

    {/* INPUT AREA */}
    <div className="flex items-end gap-2">

      {/* FILE INPUT */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];

          if (f) onPickImage(f);

          e.currentTarget.value = '';
        }}
      />

      {/* IMAGE BUTTON */}
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        title="Attach image"
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 shrink-0"
      >

        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ImageIcon size={18} />
        )}
      </button>

      {/* TEXTAREA */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={`Reply as ${me?.name || 'Faculty'}…`}
        rows={1}
        className="input flex-1 resize-none max-h-32 leading-tight text-sm sm:text-base"
      />

      {/* SEND BUTTON */}
      <button
        disabled={sending || (!text.trim() && !imageUrl)}
        onClick={send}
        className="btn-primary disabled:opacity-50 shrink-0 px-3 sm:px-4"
      >

        {sending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}

        <span className="hidden sm:inline">
          Send
        </span>
      </button>
    </div>

    {/* HELP TEXT */}
    <div className="hidden sm:block text-[10px] text-slate-400 mt-2 px-1">
      Enter to send · Shift + Enter for newline
    </div>
  </div>
</div>
  );
}

/* ─── Chat bubble ───────────────────────────────────────────────────────── */
function Bubble({ m, mine }: { m: any; mine: boolean }) {
  return (
    // <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
    //   <div className={`max-w-[68%] ${mine ? 'order-2' : ''}`}>
    //     <div className={`text-[10px] mb-1 ${mine ? 'text-right text-slate-400' : 'text-slate-400'}`}>
    //       {m.author}{m.at ? ` · ${new Date(m.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
    //     </div>
    //     <div className={`rounded-2xl px-3 py-2 shadow-sm ${
    //       mine
    //         ? 'bg-brand-500 text-white rounded-br-sm'
    //         : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
    //     }`}>
    //       {m.image_url && (
    //         <a href={m.image_url} target="_blank" rel="noreferrer" className="block mb-1">
    //           <img src={m.image_url} alt="attachment" className="rounded-lg max-h-72 object-contain bg-slate-100" />
    //         </a>
    //       )}
    //       {m.content && <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>}
    //     </div>
    //   </div>
    // </div>

    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>

  <div
    className={`max-w-[90%] sm:max-w-[80%] lg:max-w-[68%] ${
      mine ? 'order-2' : ''
    }`}
  >

    {/* META */}
    <div
      className={`text-[10px] sm:text-[11px] mb-1 ${
        mine
          ? 'text-right text-slate-400'
          : 'text-slate-400'
      }`}
    >

      {m.author}

      {m.at
        ? ` · ${new Date(m.at).toLocaleString([], {
            dateStyle: 'short',
            timeStyle: 'short',
          })}`
        : ''}
    </div>

    {/* MESSAGE BOX */}
    <div
      className={`rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm break-words ${
        mine
          ? 'bg-brand-500 text-white rounded-br-sm'
          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
      }`}
    >

      {/* IMAGE */}
      {m.image_url && (

        <a
          href={m.image_url}
          target="_blank"
          rel="noreferrer"
          className="block mb-2"
        >

          <img
            src={m.image_url}
            alt="attachment"
            className="rounded-lg max-h-56 sm:max-h-72 w-auto max-w-full object-contain bg-slate-100"
          />
        </a>
      )}

      {/* TEXT */}
      {m.content && (

        <div className="text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed break-words">

          {m.content}
        </div>
      )}
    </div>
  </div>
</div>
  );
}
