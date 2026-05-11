import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

export default function Experts() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const load = () => api.listExperts().then((d) => setList(d || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (f: any) => {
    try {
      if (editing) await api.updateExpert(editing.id, f);
      else await api.createExpert(f);
      toast.success('Saved'); setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };
  const remove = async (f: any) => { if (confirm('Delete?')) { await api.deleteExpert(f.id); load(); } };

  return (
    // <div className="p-8">
    //   <PageHeader title="Our Experts" subtitle="Highlight industry experts mentoring on your platform." action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add Expert</button>} />
    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //     {list.map((f) => (
    //       <div key={f.id} className="card p-5">
    //         <div className="font-bold text-lg">{f.name}</div>
    //         <div className="text-xs text-slate-500 mt-0.5">{f.title}</div>
    //         <p className="text-sm text-slate-600 mt-2 line-clamp-3">{f.bio}</p>
    //         <div className="flex flex-wrap gap-1 mt-3">
    //           {(f.expertise || []).map((t: string) => <span key={t} className="text-[10px] uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{t}</span>)}
    //         </div>
    //         <div className="flex gap-2 mt-4">
    //           <button onClick={() => { setEditing(f); setOpen(true); }} className="btn-outline text-xs"><Edit2 size={12} /> Edit</button>
    //           <button onClick={() => remove(f)} className="btn-ghost text-red-600 text-xs"><Trash2 size={12} /> Delete</button>
    //         </div>
    //       </div>
    //     ))}
    //     {list.length === 0 && <div className="col-span-full card p-10 text-center text-slate-500">No experts added yet.</div>}
    //   </div>
    //   <Modal open={open} title={editing ? 'Edit Expert' : 'New Expert'} onClose={() => { setOpen(false); setEditing(null); }}>
    //     <ExpertForm initial={editing} onSubmit={submit} />
    //   </Modal>
    // </div>
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">

  <PageHeader
    title="Our Experts"
    subtitle="Highlight industry experts mentoring on your platform."
    action={
      <button
        className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2 whitespace-nowrap"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        <Plus size={16} />
        <span className="hidden sm:inline">
          Add Expert
        </span>
      </button>
    }
  />

  {/* EXPERTS GRID */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

    {list.map((f) => (

      <div
        key={f.id}
        className="card p-4 sm:p-5 flex flex-col"
      >

        {/* TOP */}
        <div className="min-w-0">

          <div className="font-bold text-base sm:text-lg text-slate-900 break-words">
            {f.name}
          </div>

          <div className="text-xs sm:text-sm text-slate-500 mt-1 break-words">
            {f.title}
          </div>
        </div>

        {/* BIO */}
        <p className="text-sm text-slate-600 mt-3 line-clamp-3 break-words">
          {f.bio}
        </p>

        {/* TAGS */}
        <div className="flex flex-wrap gap-2 mt-4">

          {(f.expertise || []).map((t: string) => (

            <span
              key={t}
              className="text-[10px] sm:text-[11px] uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-1 rounded-md break-words"
            >
              {t}
            </span>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-2 mt-5">

          <button
            onClick={() => {
              setEditing(f);
              setOpen(true);
            }}
            className="btn-outline text-xs sm:text-sm flex-1 justify-center"
          >
            <Edit2 size={14} />
            Edit
          </button>

          <button
            onClick={() => remove(f)}
            className="btn-ghost text-red-600 text-xs sm:text-sm flex-1 justify-center"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    ))}

    {/* EMPTY STATE */}
    {list.length === 0 && (

      <div className="col-span-full card p-8 sm:p-10 text-center text-slate-500">
        No experts added yet.
      </div>
    )}
  </div>

  {/* MODAL */}
  <Modal
    open={open}
    title={editing ? 'Edit Expert' : 'New Expert'}
    onClose={() => {
      setOpen(false);
      setEditing(null);
    }}
  >
    <ExpertForm
      initial={editing}
      onSubmit={submit}
    />
  </Modal>
</div>
  );
}

function ExpertForm({ initial, onSubmit }: any) {
  const [f, setF] = useState({ name: initial?.name || '', title: initial?.title || '', bio: initial?.bio || '', expertise: (initial?.expertise || []).join(', '), avatar: initial?.avatar || '' });
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  return (
    // <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, expertise: f.expertise.split(',').map((s) => s.trim()).filter(Boolean) }); }} className="space-y-3">
    //   <div><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></div>
    //   <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Tax Consultant" /></div>
    //   <div><label className="label">Bio</label><textarea className="input min-h-[80px]" value={f.bio} onChange={(e) => set('bio', e.target.value)} /></div>
    //   <div><label className="label">Expertise (comma separated)</label><input className="input" value={f.expertise} onChange={(e) => set('expertise', e.target.value)} /></div>
    //   <div><label className="label">Avatar URL</label><input className="input" value={f.avatar} onChange={(e) => set('avatar', e.target.value)} /></div>
    //   <button type="submit" className="btn-primary w-full justify-center">Save</button>
    // </form>

    <form
  onSubmit={(e) => {
    e.preventDefault();

    onSubmit({
      ...f,
      expertise: f.expertise
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }}
  className="space-y-4"
>

  {/* NAME */}
  <div>
    <label className="label">
      Name
    </label>

    <input
      className="input text-sm sm:text-base"
      value={f.name}
      onChange={(e) => set('name', e.target.value)}
      required
    />
  </div>

  {/* TITLE */}
  <div>
    <label className="label">
      Title
    </label>

    <input
      className="input text-sm sm:text-base"
      value={f.title}
      onChange={(e) => set('title', e.target.value)}
      placeholder="e.g. Senior Tax Consultant"
    />
  </div>

  {/* BIO */}
  <div>
    <label className="label">
      Bio
    </label>

    <textarea
      className="input min-h-[100px] text-sm sm:text-base resize-none"
      value={f.bio}
      onChange={(e) => set('bio', e.target.value)}
    />
  </div>

  {/* EXPERTISE */}
  <div>
    <label className="label">
      Expertise (comma separated)
    </label>

    <input
      className="input text-sm sm:text-base"
      value={f.expertise}
      onChange={(e) => set('expertise', e.target.value)}
      placeholder="Taxation, GST, Finance..."
    />

    <div className="text-[11px] sm:text-xs text-slate-500 mt-1">
      Separate each expertise using commas.
    </div>
  </div>

  {/* AVATAR URL */}
  <div>
    <label className="label">
      Avatar URL
    </label>

    <input
      className="input text-sm sm:text-base"
      value={f.avatar}
      onChange={(e) => set('avatar', e.target.value)}
      placeholder="https://example.com/avatar.jpg"
    />
  </div>

  {/* BUTTON */}
  <button
    type="submit"
    className="btn-primary w-full justify-center text-sm sm:text-base py-2.5"
  >
    Save
  </button>
</form>
  );
}
