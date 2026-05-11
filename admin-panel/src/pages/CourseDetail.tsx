import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Plus, Trash2, Edit2, GripVertical, ChevronLeft, ChevronDown, ChevronRight,
  Video, FileText, MessageCircle, Brain, ExternalLink, Upload, Loader2, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

const ITEM_ICONS: any = {
  video: Video,
  pdf: FileText,
  doubt: MessageCircle,
  quiz: Brain,
  link: ExternalLink,
  summary: BookOpen,
};
const ITEM_COLORS: any = {
  video: 'bg-rose-100 text-rose-700',
  pdf: 'bg-amber-100 text-amber-800',
  doubt: 'bg-violet-100 text-violet-700',
  quiz: 'bg-emerald-100 text-emerald-700',
  link: 'bg-sky-100 text-sky-700',
  summary: 'bg-indigo-100 text-indigo-700',
};
const ITEM_TYPES = ['video', 'pdf', 'summary', 'doubt', 'quiz', 'link'] as const;
type ItemType = typeof ITEM_TYPES[number];

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<any>(null);
  const [openCh, setOpenCh] = useState<string | null>(null);
  const [chModal, setChModal] = useState<{ ch?: any } | null>(null);
  const [modModal, setModModal] = useState<{ chId: string; mod?: any } | null>(null);

  const reload = () => api.listCourses().then((cs) => setCourse(cs.find((c: any) => c.id === id) || null));
  useEffect(() => { reload(); }, [id]);

  // Hooks must be called unconditionally on every render (Rules of Hooks).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (!course) return <div className="p-8 text-slate-500">Loading…</div>;

  const chapters = (course.chapters || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const reorderChapters = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = chapters.findIndex((c: any) => c.id === active.id);
    const newI = chapters.findIndex((c: any) => c.id === over.id);
    const next = arrayMove(chapters, oldI, newI);
    setCourse({ ...course, chapters: next });
    try { await api.reorderChapters(course.id, next.map((c: any) => c.id)); toast.success('Reordered'); }
    catch { toast.error('Failed'); reload(); }
  };

  const reorderModules = async (chId: string, mods: any[], e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = mods.findIndex((m) => m.id === active.id);
    const newI = mods.findIndex((m) => m.id === over.id);
    const next = arrayMove(mods, oldI, newI);
    const updated = course.chapters.map((c: any) => c.id === chId ? { ...c, modules: next } : c);
    setCourse({ ...course, chapters: updated });
    try { await api.reorderModules(course.id, chId, next.map((m) => m.id)); toast.success('Reordered'); }
    catch { toast.error('Failed'); reload(); }
  };

  const saveChapter = async (form: any) => {
    try {
      if (chModal?.ch) await api.updateChapter(course.id, chModal.ch.id, form);
      else await api.addChapter(course.id, form);
      toast.success('Saved'); setChModal(null); reload();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };
  const removeChapter = async (ch: any) => {
    if (!confirm(`Delete chapter "${ch.title}" and all its modules? This is irreversible.`)) return;
    await api.deleteChapter(course.id, ch.id); reload(); toast.success('Deleted');
  };

  const saveModule = async (form: any) => {
    if (!modModal) return;
    try {
      if (modModal.mod) await api.updateModule(course.id, modModal.chId, modModal.mod.id, form);
      else await api.addModule(course.id, modModal.chId, form);
      toast.success('Saved'); setModModal(null); reload();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };
  const removeModule = async (chId: string, mod: any) => {
    if (!confirm(`Delete module "${mod.title}"?`)) return;
    await api.deleteModule(course.id, chId, mod.id); reload(); toast.success('Deleted');
  };

  return (
    <div className="p-8">
      <Link to="/courses" className="text-sm text-brand-500 inline-flex items-center gap-1 mb-3 font-semibold"><ChevronLeft size={16} /> All Courses</Link>
      <PageHeader
        title={course.title}
        subtitle={`${course.category} · ₹${Number(course.price).toLocaleString('en-IN')} · ${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`}
        action={<button className="btn-primary" onClick={() => setChModal({})}><Plus size={16} /> Add Chapter</button>}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderChapters}>
        <SortableContext items={chapters.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {chapters.map((ch: any) => (
              <ChapterCard key={ch.id} ch={ch}
                expanded={openCh === ch.id} onToggle={() => setOpenCh(openCh === ch.id ? null : ch.id)}
                onEdit={() => setChModal({ ch })} onDelete={() => removeChapter(ch)}
                onAddModule={() => setModModal({ chId: ch.id })}
                onEditModule={(m: any) => setModModal({ chId: ch.id, mod: m })}
                onDeleteModule={(m: any) => removeModule(ch.id, m)}
                onReorderModules={(e) => reorderModules(ch.id, (ch.modules || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), e)}
              />
            ))}
            {chapters.length === 0 && <div className="card p-12 text-center text-slate-500">No chapters yet — click "Add Chapter" above.</div>}
          </div>
        </SortableContext>
      </DndContext>

      <Modal open={!!chModal} title={chModal?.ch ? 'Edit Chapter' : 'Add Chapter'} onClose={() => setChModal(null)}>
        <ChapterForm initial={chModal?.ch} onSubmit={saveChapter} />
      </Modal>
      <Modal open={!!modModal} title={modModal?.mod ? 'Edit Module' : 'Add Module'} onClose={() => setModModal(null)} wide>
        <ModuleForm key={modModal?.mod?.id || 'new'} initial={modModal?.mod} onSubmit={saveModule} />
      </Modal>
    </div>


  );
}

/* ─── Chapter card ──────────────────────────────────────────────────────── */
function ChapterCard({ ch, expanded, onToggle, onEdit, onDelete, onAddModule, onEditModule, onDeleteModule, onReorderModules }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: ch.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const mods = (ch.modules || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  return (
    <div ref={setNodeRef} style={style} className="card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing" aria-label="Drag chapter"><GripVertical size={18} /></button>
        <button onClick={onToggle} className="text-slate-500">{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
        <div className="flex-1">
          <div className="font-bold">{ch.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{mods.length} module{mods.length === 1 ? '' : 's'}</div>
        </div>
        <button onClick={onEdit} className="btn-ghost"><Edit2 size={14} /></button>
        <button onClick={onDelete} className="btn-ghost text-red-600"><Trash2 size={14} /></button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
          <div className="flex justify-end pt-3">
            <button onClick={onAddModule} className="btn-outline"><Plus size={14} /> Add Module</button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorderModules}>
            <SortableContext items={mods.map((m: any) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 mt-3">
                {mods.map((m: any) => <ModuleRow key={m.id} mod={m} onEdit={() => onEditModule(m)} onDelete={() => onDeleteModule(m)} />)}
                {mods.length === 0 && <div className="text-center text-sm text-slate-500 py-4">No modules — add one with the button above.</div>}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function ModuleRow({ mod, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mod.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const items = (mod.items || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  return (
    <div ref={setNodeRef} style={style} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
      <button {...attributes} {...listeners} className="text-slate-400 cursor-grab active:cursor-grabbing" aria-label="Drag module"><GripVertical size={16} /></button>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{mod.title}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map((it: any) => {
            const Icon = ITEM_ICONS[it.type] || FileText;
            return (
              <span key={it.id} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 ${ITEM_COLORS[it.type] || 'bg-slate-100 text-slate-600'}`}>
                <Icon size={10} /> {it.type}
              </span>
            );
          })}
          {items.length === 0 && <span className="text-[10px] text-slate-400">no items</span>}
        </div>
      </div>
      <button onClick={onEdit} className="btn-ghost"><Edit2 size={14} /></button>
      <button onClick={onDelete} className="btn-ghost text-red-600"><Trash2 size={14} /></button>
    </div>
  );
}

/* ─── Chapter form ──────────────────────────────────────────────────────── */
function ChapterForm({ initial, onSubmit }: any) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ title, description }); }} className="space-y-3">
      <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
      <div><label className="label">Description (optional)</label><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <button type="submit" className="btn-primary w-full justify-center">Save</button>
    </form>
  );
}

/* ─── Module form (draggable items, transcript inline w/ video) ─────────── */
function ModuleForm({ initial, onSubmit }: any) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [items, setItems] = useState<any[]>(() =>
    (initial?.items || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((it: any, idx: number) => ({ ...it, _key: it.id || `t_${idx}` })),
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const addItem = (type: ItemType) => setItems((cur) => [
    ...cur,
    { _key: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, title: '', video_url: '', pdf_url: '', href: '', content: '', transcript: [] },
  ]);
  const updItem = (key: string, patch: any) => setItems((cur) => cur.map((x) => x._key === key ? { ...x, ...patch } : x));
  const delItem = (key: string) => setItems((cur) => cur.filter((x) => x._key !== key));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = items.findIndex((x) => x._key === active.id);
    const newI = items.findIndex((x) => x._key === over.id);
    if (oldI < 0 || newI < 0) return;
    setItems(arrayMove(items, oldI, newI));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = items.map((it, idx) => {
      const { _key: _drop, ...rest } = it;
      return { ...rest, order: idx + 1 };
    });
    onSubmit({ title, description, items: cleaned });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Module meta */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
        <div>
          <label className="label">Module Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="e.g. Formal Letters &amp; Memos" />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What students will learn in this module" />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Items <span className="text-slate-400 font-medium">({items.length})</span></h4>
            <div className="text-xs text-slate-500 mt-0.5">Drag <GripVertical size={11} className="inline -mt-0.5" /> to reorder · mix any of the 6 types</div>
          </div>
        </div>

        {/* Add-buttons row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-4">
          {ITEM_TYPES.map((t) => {
            const Icon = ITEM_ICONS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => addItem(t)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border border-slate-200 text-[11px] font-bold uppercase tracking-wide hover:border-brand-500 hover:bg-brand-50 transition-colors ${ITEM_COLORS[t] || ''}`}>
                <Icon size={14} />
                + {t}
              </button>
            );
          })}
        </div>

        {/* Item list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <ItemEditor key={it._key} idx={idx + 1} it={it} onChange={(patch: any) => updItem(it._key, patch)} onDelete={() => delItem(it._key)} />
              ))}
              {items.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  No items yet — pick a type above to add your first item.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <button type="submit" className="btn-primary w-full justify-center text-base py-3">Save Module</button>
      </div>
    </form>
  );
}

/* ─── Item editor (handles each type incl. video transcript + S3 upload) ── */
function ItemEditor({ idx, it, onChange, onDelete }: { idx: number; it: any; onChange: (p: any) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: it._key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = ITEM_ICONS[it.type] || FileText;
  const [expanded, setExpanded] = useState(true);

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <button {...attributes} {...listeners} type="button" className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing" aria-label="Drag item" title="Drag to reorder">
          <GripVertical size={16} />
        </button>
        <span className="text-[10px] font-bold text-slate-400">#{idx}</span>
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 ${ITEM_COLORS[it.type] || 'bg-slate-200 text-slate-700'}`}>
          <Icon size={10} /> {it.type}
        </span>
        <input
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm font-semibold text-slate-800 placeholder-slate-400 px-1"
          placeholder={`Item title…`}
          value={it.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          required
        />
        <button type="button" onClick={() => setExpanded((x) => !x)} className="text-slate-400 hover:text-slate-700 text-xs px-1" title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▾' : '▸'}
        </button>
        <button type="button" onClick={onDelete} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Delete item"><Trash2 size={14} /></button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-2">
          {it.type === 'video' && <VideoFields it={it} onChange={onChange} />}
          {it.type === 'pdf' && (
            <div className="space-y-2">
              <FileFieldRow label="PDF" accept="application/pdf" value={it.pdf_url} onChange={(url) => onChange({ pdf_url: url })} purpose="image" />
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Answer Sheet (optional)</div>
                <FileFieldRow label="Answer Sheet" accept="application/pdf" value={it.answer_sheet_url} onChange={(url) => onChange({ answer_sheet_url: url })} purpose="image" />
                <div className="mt-1.5">
                  <label className="text-[11px] text-slate-500 block mb-0.5">Publish answer sheet on (date)</label>
                  <input
                    className="input"
                    type="date"
                    value={(it.answer_sheet_publish_at || '').slice(0, 10)}
                    onChange={(e) => onChange({ answer_sheet_publish_at: e.target.value || null })}
                  />
                  <div className="text-[10px] text-slate-400 mt-0.5">Students can download the answer sheet only on/after this date.</div>
                </div>
              </div>
            </div>
          )}
          {it.type === 'link' && (
            <input className="input" placeholder="https://… (external link)" value={it.href || ''} onChange={(e) => onChange({ href: e.target.value })} />
          )}
          {it.type === 'summary' && (
            <textarea
              className="input min-h-[120px] font-mono text-sm"
              placeholder="Summary content (markdown supported)…"
              value={it.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
            />
          )}
          {it.type === 'doubt' && (
            <div className="text-[12px] text-slate-500 italic px-2">Students can ask doubts on this lesson — no extra config needed.</div>
          )}
          {it.type === 'quiz' && (
            <input className="input" placeholder="Quiz ID (link to quiz bank)" value={it.quiz_id || ''} onChange={(e) => onChange({ quiz_id: e.target.value })} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Video fields: URL/upload + transcript editor ──────────────────────── */
function VideoFields({ it, onChange }: { it: any; onChange: (p: any) => void }) {
  const [showTranscript, setShowTranscript] = useState(((it.transcript || []).length > 0));
  const transcript: { sec: number; text: string; topic?: string }[] = it.transcript || [];

  const addLine = () => {
    const last = transcript[transcript.length - 1];
    const nextSec = last ? last.sec + 30 : 0;
    onChange({ transcript: [...transcript, { sec: nextSec, text: '' }] });
  };
  const updLine = (idx: number, patch: any) => {
    const next = transcript.map((l, i) => i === idx ? { ...l, ...patch } : l);
    onChange({ transcript: next });
  };
  const delLine = (idx: number) => onChange({ transcript: transcript.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-2">
      <FileFieldRow label="Video" accept="video/*" value={it.video_url} onChange={(url) => onChange({ video_url: url })} purpose="video" />
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" min={0} placeholder="Duration (seconds)" value={it.duration || 0} onChange={(e) => onChange({ duration: Number(e.target.value) })} />
        <button type="button" className="btn-outline text-xs justify-center" onClick={() => setShowTranscript((s) => !s)}>
          {showTranscript ? 'Hide' : 'Edit'} Transcript ({transcript.length})
        </button>
      </div>
      {showTranscript && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700">Transcript (synced captions)</div>
            <button type="button" onClick={addLine} className="btn-outline text-xs"><Plus size={12} /> Add line</button>
          </div>
          {transcript.length === 0 && <div className="text-xs text-slate-400 italic py-2">No lines yet — click "Add line" to start.</div>}
          {transcript.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input className="input w-20 text-xs" type="number" min={0} placeholder="sec" value={line.sec} onChange={(e) => updLine(idx, { sec: Number(e.target.value) })} />
              <input className="input flex-1 text-xs" placeholder="Caption text" value={line.text} onChange={(e) => updLine(idx, { text: e.target.value })} />
              <input className="input w-32 text-xs" placeholder="Topic (opt.)" value={line.topic || ''} onChange={(e) => updLine(idx, { topic: e.target.value })} />
              <button type="button" onClick={() => delLine(idx)} className="btn-ghost text-red-600"><Trash2 size={12} /></button>
            </div>
          ))}
          <div className="text-[11px] text-slate-400 pt-1">Tip: paste a SRT/VTT file in the future. For now, manually enter time-text pairs.</div>
        </div>
      )}
    </div>
  );
}

/* ─── File field with paste-URL OR upload-to-S3 ─────────────────────────── */
function FileFieldRow({ label, accept, value, onChange, purpose }: { label: string; accept: string; value?: string; onChange: (url: string) => void; purpose: 'video' | 'image' }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    setBusy(true);
    try {
      const url = await api.uploadFile(file, purpose);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <input className="input flex-1" placeholder={`${label} URL (paste or upload →)`} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-outline whitespace-nowrap">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}
