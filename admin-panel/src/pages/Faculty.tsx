import { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Upload, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

export default function Faculty() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const load = () => api.listFaculties().then((d) => setList(d || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (f: any) => {
    try {
      if (editing) await api.updateFaculty(editing.id, f);
      else await api.createFaculty(f);
      toast.success('Saved'); setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };
  const remove = async (f: any) => { if (confirm('Delete?')) { await api.deleteFaculty(f.id); load(); } };

  return (
    // <div className="p-8">
    //   <PageHeader title="Faculty" subtitle="Add the teachers your courses showcase." action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add Faculty</button>} />
    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //     {list.map((f) => (
    //       <div key={f.id} className="card p-5">
    //         <div className="flex items-center gap-3">
    //           {f.avatar
    //             ? <img src={f.avatar} alt={f.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
    //             : <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-400"><User size={22} /></div>}
    //           <div className="flex-1 min-w-0">
    //             <div className="font-bold text-lg truncate">{f.name}</div>
    //             <div className="text-xs text-slate-500 mt-0.5">{f.subject}</div>
    //           </div>
    //         </div>
    //         <p className="text-sm text-slate-600 mt-3 line-clamp-3">{f.bio}</p>
    //         <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
    //           <span>★ {f.rating}</span>
    //           <span>{(f.students || 0).toLocaleString()} students</span>
    //         </div>
    //         <div className="flex gap-2 mt-4">
    //           <button onClick={() => { setEditing(f); setOpen(true); }} className="btn-outline text-xs"><Edit2 size={12} /> Edit</button>
    //           <button onClick={() => remove(f)} className="btn-ghost text-red-600 text-xs"><Trash2 size={12} /> Delete</button>
    //         </div>
    //       </div>
    //     ))}
    //     {list.length === 0 && <div className="col-span-full card p-10 text-center text-slate-500">No faculty added yet.</div>}
    //   </div>
    //   <Modal open={open} title={editing ? 'Edit Faculty' : 'New Faculty'} onClose={() => { setOpen(false); setEditing(null); }}>
    //     <FacultyForm key={editing?.id || 'new'} initial={editing} onSubmit={submit} />
    //   </Modal>
    // </div>
    <div className="p-4 sm:p-6 lg:p-8">

  <PageHeader
    title="Faculty"
    subtitle="Add the teachers your courses showcase."
    action={
      <button
        className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        <Plus size={16} />

        <span className="hidden sm:inline">
          Add Faculty
        </span>
      </button>
    }
  />

  {/* GRID */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

    {list.map((f) => (

      <div
        key={f.id}
        className="card p-4 sm:p-5 flex flex-col"
      >

        {/* TOP */}
        <div className="flex items-start gap-3">

          {f.avatar ? (
            <img
              src={f.avatar}
              alt={f.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">

              <User size={22} />
            </div>
          )}

          <div className="flex-1 min-w-0">

            <div className="font-bold text-base sm:text-lg truncate">
              {f.name}
            </div>

            <div className="text-xs sm:text-sm text-slate-500 mt-0.5 break-words">
              {f.subject}
            </div>
          </div>
        </div>

        {/* BIO */}
        <p className="text-sm text-slate-600 mt-3 line-clamp-3 break-words flex-1">
          {f.bio}
        </p>

        {/* STATS */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs sm:text-sm text-slate-500">

          <span>
            ★ {f.rating}
          </span>

          <span>
            {(f.students || 0).toLocaleString()} students
          </span>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 mt-4">

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

    {list.length === 0 && (
      <div className="col-span-full card p-10 text-center text-slate-500">
        No faculty added yet.
      </div>
    )}
  </div>

  <Modal
    open={open}
    title={editing ? 'Edit Faculty' : 'New Faculty'}
    onClose={() => {
      setOpen(false);
      setEditing(null);
    }}
  >
    <FacultyForm
      key={editing?.id || 'new'}
      initial={editing}
      onSubmit={submit}
    />
  </Modal>
</div>
  );
}

function FacultyForm({ initial, onSubmit }: any) {
  const [f, setF] = useState({ name: initial?.name || '', subject: initial?.subject || '', bio: initial?.bio || '', rating: initial?.rating || 4.8, students: initial?.students || 0, avatar: initial?.avatar || '' });
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPickAvatar = async (file: File) => {
    setUploading(true);
    try {
      const url = await api.uploadFile(file, 'avatar');
      set('avatar', url);
      toast.success('Avatar uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    // <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, rating: Number(f.rating), students: Number(f.students) }); }} className="space-y-3">
    //   {/* Avatar uploader at the top */}
    //   <div className="flex items-center gap-3">
    //     {f.avatar
    //       ? <img src={f.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
    //       : <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={26} /></div>}
    //     <div className="flex-1">
    //       <label className="label">Avatar</label>
    //       <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPickAvatar(file); e.currentTarget.value = ''; }} />
    //       <div className="flex gap-2">
    //         <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="btn-outline">
    //           {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? 'Uploading…' : 'Upload image'}
    //         </button>
    //         {f.avatar && <button type="button" onClick={() => set('avatar', '')} className="btn-ghost text-red-600 text-xs">Remove</button>}
    //       </div>
    //       <input className="input mt-2 text-xs" placeholder="…or paste an image URL" value={f.avatar} onChange={(e) => set('avatar', e.target.value)} />
    //     </div>
    //   </div>

    //   <div><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></div>
    //   <div><label className="label">Subject</label><input className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)} /></div>
    //   <div><label className="label">Bio</label><textarea className="input min-h-[80px]" value={f.bio} onChange={(e) => set('bio', e.target.value)} /></div>
    //   <div className="grid grid-cols-2 gap-3">
    //     <div><label className="label">Rating</label><input className="input" type="number" step="0.1" value={f.rating} onChange={(e) => set('rating', e.target.value)} /></div>
    //     <div><label className="label">Students</label><input className="input" type="number" value={f.students} onChange={(e) => set('students', e.target.value)} /></div>
    //   </div>
    //   <button type="submit" className="btn-primary w-full justify-center">Save</button>
    // </form>

    <form
  onSubmit={(e) => {
    e.preventDefault();

    onSubmit({
      ...f,
      rating: Number(f.rating),
      students: Number(f.students),
    });
  }}
  className="space-y-4"
>

  {/* AVATAR */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

    {f.avatar ? (
      <img
        src={f.avatar}
        alt="avatar"
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
      />
    ) : (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">

        <User size={28} />
      </div>
    )}

    <div className="flex-1 w-full">

      <label className="label">
        Avatar
      </label>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) onPickAvatar(file);

          e.currentTarget.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="btn-outline text-xs sm:text-sm"
        >
          {uploading ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Upload size={14} />
          )}

          {uploading ? 'Uploading…' : 'Upload image'}
        </button>

        {f.avatar && (
          <button
            type="button"
            onClick={() => set('avatar', '')}
            className="btn-ghost text-red-600 text-xs sm:text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <input
        className="input mt-2 text-xs sm:text-sm"
        placeholder="…or paste an image URL"
        value={f.avatar}
        onChange={(e) => set('avatar', e.target.value)}
      />
    </div>
  </div>

  {/* NAME */}
  <div>

    <label className="label">
      Name
    </label>

    <input
      className="input"
      value={f.name}
      onChange={(e) => set('name', e.target.value)}
      required
    />
  </div>

  {/* SUBJECT */}
  <div>

    <label className="label">
      Subject
    </label>

    <input
      className="input"
      value={f.subject}
      onChange={(e) => set('subject', e.target.value)}
    />
  </div>

  {/* BIO */}
  <div>

    <label className="label">
      Bio
    </label>

    <textarea
      className="input min-h-[100px] resize-none"
      value={f.bio}
      onChange={(e) => set('bio', e.target.value)}
    />
  </div>

  {/* RATING + STUDENTS */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

    <div>

      <label className="label">
        Rating
      </label>

      <input
        className="input"
        type="number"
        step="0.1"
        value={f.rating}
        onChange={(e) => set('rating', e.target.value)}
      />
    </div>

    <div>

      <label className="label">
        Students
      </label>

      <input
        className="input"
        type="number"
        value={f.students}
        onChange={(e) => set('students', e.target.value)}
      />
    </div>
  </div>

  {/* BUTTON */}
  <button
    type="submit"
    className="btn-primary w-full justify-center"
  >
    Save
  </button>
</form>
  );
}
