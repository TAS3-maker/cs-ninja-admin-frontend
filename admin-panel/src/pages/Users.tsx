import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getStoredUser } from '../api';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

const ROLES = ['superadmin', 'teacher', 'assistant', 'accountant'];
const PERMS = ['course:read', 'course:write', 'doubt:read', 'doubt:reply', 'pdf:read', 'pdf:write'];

export default function Users() {
  const me = getStoredUser();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const isSuperadmin = me?.role === 'superadmin';

  const load = () => api.listUsers().then(setUsers).catch((e) => toast.error(e?.response?.data?.error || 'Failed to load'));
  useEffect(() => { load(); api.listCourses().then(setCourses).catch(() => {}); }, []);

  const filtered = users.filter((u) =>
    !filter || u.name?.toLowerCase().includes(filter.toLowerCase()) || u.email?.toLowerCase().includes(filter.toLowerCase()),
  );

  const submit = async (form: any) => {
    try {
      if (editing) {
        await api.updateUser(editing.id, form);
        toast.success('User updated');
      } else {
        await api.createUser(form);
        toast.success('User created');
      }
      setOpen(false); setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed');
    }
  };

  const remove = async (u: any) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    try { await api.deleteUser(u.id); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  return (
    // <div className="p-8">
    //   <PageHeader
    //     title="Users"
    //     subtitle="Manage staff (teachers, assistants, accountants) and view all platform users."
    //     action={
    //       <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
    //         <Plus size={16} /> Add User
    //       </button>
    //     }
    //   />
    //   <div className="card p-4 mb-4 flex items-center gap-3">
    //     <Search size={18} className="text-slate-400" />
    //     <input className="input border-0 focus:ring-0 px-0" placeholder="Search by name or email…" value={filter} onChange={(e) => setFilter(e.target.value)} />
    //   </div>
    //   <div className="card overflow-hidden">
    //     <table className="w-full text-sm">
    //       <thead className="bg-slate-50 border-b border-slate-200">
    //         <tr className="text-left">
    //           <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Courses</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {filtered.map((u) => (
    //           <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
    //             <td className="px-4 py-3 font-medium">
    //               <div className="flex items-center gap-3">
    //                 <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
    //                   {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || 'U').slice(0, 2).toUpperCase()}
    //                 </div>
    //                 <span>{u.name}</span>
    //               </div>
    //             </td>
    //             <td className="px-4 py-3 text-slate-600">{u.email}</td>
    //             <td className="px-4 py-3"><span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${roleBadge(u.role)}`}>{u.role || 'student'}</span></td>
    //             <td className="px-4 py-3 text-slate-600">{(u.assigned_courses || []).length || '—'}</td>
    //             <td className="px-4 py-3 text-right space-x-2">
    //               <button className="btn-ghost" onClick={() => { setEditing(u); setOpen(true); }}><Edit2 size={14} /></button>
    //               {isSuperadmin && u.id !== me.id && <button className="btn-ghost text-red-600" onClick={() => remove(u)}><Trash2 size={14} /></button>}
    //             </td>
    //           </tr>
    //         ))}
    //         {filtered.length === 0 && (<tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No users found.</td></tr>)}
    //       </tbody>
    //     </table>
    //   </div>

    //   <Modal open={open} title={editing ? 'Edit User' : 'New User'} onClose={() => { setOpen(false); setEditing(null); }}>
    //     <UserForm initial={editing} courses={courses} onSubmit={submit} isSuperadmin={isSuperadmin} />
    //   </Modal>
    // </div>

  <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden">

  <PageHeader
    title="Users"
    subtitle="Manage staff (teachers, assistants, accountants) and view all platform users."
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
          Add User
        </span>
      </button>
    }
  />

  {/* SEARCH */}
  <div className="card p-3 sm:p-4 mb-4 flex items-center gap-3">

    <Search
      size={18}
      className="text-slate-400 shrink-0"
    />

    <input
      className="input border-0 focus:ring-0 px-0 text-sm sm:text-base min-w-0"
      placeholder="Search by name or email…"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
  </div>

  {/* DESKTOP + TABLET */}
  <div className="hidden sm:block card overflow-x-auto">

    <table className="w-full min-w-[750px] text-sm">

      <thead className="bg-slate-50 border-b border-slate-200">

        <tr className="text-left">

          <th className="px-4 py-3 font-semibold text-slate-700">
            Name
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Email
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Role
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Courses
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700 text-right">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>

        {filtered.map((u) => (
          <tr
            key={u.id}
            className="border-b border-slate-100 hover:bg-slate-50"
          >

            {/* NAME */}
            <td className="px-4 py-3 font-medium">

              <div className="flex items-center gap-3">

                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">

                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (u.name || 'U')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <span>
                  {u.name}
                </span>
              </div>
            </td>

            {/* EMAIL */}
            <td className="px-4 py-3 text-slate-600">
              {u.email}
            </td>

            {/* ROLE */}
            <td className="px-4 py-3">

              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${roleBadge(
                  u.role
                )}`}
              >
                {u.role || 'student'}
              </span>
            </td>

            {/* COURSES */}
            <td className="px-4 py-3 text-slate-600">
              {(u.assigned_courses || []).length || '—'}
            </td>

            {/* ACTIONS */}
            <td className="px-4 py-3">

              <div className="flex items-center justify-end gap-2">

                <button
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(u);
                    setOpen(true);
                  }}
                >
                  <Edit2 size={14} />
                </button>

                {isSuperadmin && u.id !== me.id && (
                  <button
                    className="btn-ghost text-red-600"
                    onClick={() => remove(u)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}

        {filtered.length === 0 && (
          <tr>
            <td
              colSpan={5}
              className="px-4 py-12 text-center text-slate-500"
            >
              No users found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* MOBILE VIEW */}
  <div className="sm:hidden space-y-4">

    {filtered.map((u) => (

      <div
        key={u.id}
        className="card p-4"
      >

        <div className="grid grid-cols-[90px_1fr] gap-y-3 text-sm">

          {/* NAME */}
          <div className="font-semibold text-slate-700">
            Name
          </div>

          <div className="flex items-center gap-3 min-w-0">

            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">

              {u.avatar ? (
                <img
                  src={u.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                (u.name || 'U')
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>

            <span className="truncate">
              {u.name}
            </span>
          </div>

          {/* EMAIL */}
          <div className="font-semibold text-slate-700">
            Email
          </div>

          <div className="break-all text-slate-600">
            {u.email}
          </div>

          {/* ROLE */}
          <div className="font-semibold text-slate-700">
            Role
          </div>

          <div>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${roleBadge(
                u.role
              )}`}
            >
              {u.role || 'student'}
            </span>
          </div>

          {/* COURSES */}
          <div className="font-semibold text-slate-700">
            Courses
          </div>

          <div className="text-slate-600">
            {(u.assigned_courses || []).length || '—'}
          </div>

          {/* ACTIONS */}
          <div className="font-semibold text-slate-700">
            Actions
          </div>

          <div className="flex items-center gap-2">

            <button
              className="btn-ghost"
              onClick={() => {
                setEditing(u);
                setOpen(true);
              }}
            >
              <Edit2 size={14} />
            </button>

            {isSuperadmin && u.id !== me.id && (
              <button
                className="btn-ghost text-red-600"
                onClick={() => remove(u)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    ))}

    {filtered.length === 0 && (
      <div className="card p-10 text-center text-slate-500">
        No users found.
      </div>
    )}
  </div>

  {/* MODAL */}
  <Modal
    open={open}
    title={editing ? 'Edit User' : 'New User'}
    onClose={() => {
      setOpen(false);
      setEditing(null);
    }}
  >
    <UserForm
      initial={editing}
      courses={courses}
      onSubmit={submit}
      isSuperadmin={isSuperadmin}
    />
  </Modal>
</div>
  );
}

function roleBadge(r?: string) {
  switch (r) {
    case 'superadmin': return 'bg-rose-100 text-rose-700';
    case 'teacher':    return 'bg-indigo-100 text-indigo-700';
    case 'assistant':  return 'bg-amber-100 text-amber-700';
    case 'accountant': return 'bg-emerald-100 text-emerald-700';
    default:           return 'bg-slate-100 text-slate-700';
  }
}

function UserForm({ initial, courses, onSubmit, isSuperadmin }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initial?.role || 'assistant');
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions || ['doubt:read','doubt:reply']);
  const [assigned, setAssigned] = useState<string[]>(initial?.assigned_courses || []);
  const [avatar, setAvatar] = useState<string>(initial?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = (window as any).React?.useRef ? (window as any).React.useRef(null) : null;

  const togglePerm = (p: string) => setPermissions((x) => x.includes(p) ? x.filter((y) => y !== p) : [...x, p]);
  const toggleCourse = (c: string) => setAssigned((x) => x.includes(c) ? x.filter((y) => y !== c) : [...x, c]);

  // Pick a file from disk → presign → PUT to S3 → set cloudfront URL in form
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, content_type: file.type || 'image/jpeg' }),
      });
      if (!presignRes.ok) throw new Error('Presign failed');
      const presign = await presignRes.json();
      const put = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!put.ok) throw new Error('Upload failed');
      setAvatar(presign.public_url);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { name, email, role, permissions, assigned_courses: assigned, avatar };
    if (password) body.password = password;
    onSubmit(body);
  };

  return (
    // <form onSubmit={submit} className="space-y-4">
    //   {/* Avatar / DP picker */}
    //   <div className="flex items-center gap-4">
    //     <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xl">
    //       {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : (name || 'U').slice(0, 2).toUpperCase()}
    //     </div>
    //     <div>
    //       <label className="btn-outline cursor-pointer inline-flex">
    //         {uploading ? 'Uploading…' : 'Upload Photo'}
    //         <input type="file" accept="image/*" onChange={onPickFile} className="hidden" disabled={uploading} />
    //       </label>
    //       {avatar && (
    //         <button type="button" onClick={() => setAvatar('')} className="btn-ghost text-red-600 text-xs ml-2">Remove</button>
    //       )}
    //       <div className="text-[11px] text-slate-500 mt-1">Recommended: square, &lt; 2MB</div>
    //     </div>
    //   </div>

    //   <div className="grid grid-cols-2 gap-3">
    //     <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
    //     <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!initial} /></div>
    //   </div>
    //   {!initial && (
    //     <div><label className="label">Password</label><input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required={!initial} /></div>
    //   )}
    //   <div>
    //     <label className="label">Role</label>
    //     <select className="input" value={role} onChange={(e) => setRole(e.target.value)} disabled={!isSuperadmin && initial}>
    //       {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
    //     </select>
    //   </div>
    //   {role === 'assistant' && (
    //     <div>
    //       <label className="label">Permissions</label>
    //       <div className="flex flex-wrap gap-2">
    //         {PERMS.map((p) => (
    //           <button type="button" key={p} onClick={() => togglePerm(p)}
    //             className={`text-xs px-3 py-1.5 rounded-lg border ${permissions.includes(p) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-300'}`}>{p}</button>
    //         ))}
    //       </div>
    //     </div>
    //   )}
    //   {(role === 'teacher' || role === 'assistant') && (
    //     <div>
    //       <label className="label">Assigned Courses</label>
    //       <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
    //         {courses.map((c: any) => (
    //           <button type="button" key={c.id} onClick={() => toggleCourse(c.id)}
    //             className={`text-xs px-3 py-1.5 rounded-lg border ${assigned.includes(c.id) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-300'}`}>{c.title}</button>
    //         ))}
    //       </div>
    //     </div>
    //   )}
    //   <button type="submit" className="btn-primary w-full justify-center">Save</button>
    // </form>

    <form onSubmit={submit} className="space-y-4 w-full max-w-4xl mx-auto">

  {/* Avatar / DP picker */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">

    <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xl shrink-0">
      {avatar ? (
        <img
          src={avatar}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      ) : (
        (name || 'U').slice(0, 2).toUpperCase()
      )}
    </div>

    <div className="min-w-0">
      <label className="btn-outline cursor-pointer inline-flex items-center">
        {uploading ? 'Uploading…' : 'Upload Photo'}

        <input
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {avatar && (
        <button
          type="button"
          onClick={() => setAvatar('')}
          className="btn-ghost text-red-600 text-xs ml-2"
        >
          Remove
        </button>
      )}

      <div className="text-[11px] text-slate-500 mt-1">
        Recommended: square, &lt; 2MB
      </div>
    </div>
  </div>

  {/* NAME + EMAIL */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div className="min-w-0">
      <label className="label">
        Name
      </label>

      <input
        className="input w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
    </div>

    <div className="min-w-0">
      <label className="label">
        Email
      </label>

      <input
        className="input w-full"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={!!initial}
      />
    </div>
  </div>

  {/* PASSWORD */}
  {!initial && (
    <div>
      <label className="label">
        Password
      </label>

      <input
        className="input w-full"
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required={!initial}
      />
    </div>
  )}

  {/* ROLE */}
  <div>
    <label className="label">
      Role
    </label>

    <select
      className="input w-full"
      value={role}
      onChange={(e) => setRole(e.target.value)}
      disabled={!isSuperadmin && initial}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  </div>

  {/* PERMISSIONS */}
  {role === 'assistant' && (
    <div>

      <label className="label">
        Permissions
      </label>

      <div className="flex flex-wrap gap-2">

        {PERMS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => togglePerm(p)}
            className={`text-xs sm:text-sm px-3 py-2 rounded-lg border transition-colors ${
              permissions.includes(p)
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* ASSIGNED COURSES */}
  {(role === 'teacher' || role === 'assistant') && (
    <div>

      <label className="label">
        Assigned Courses
      </label>

      <div className="flex flex-wrap gap-2 max-h-40 overflow-auto pr-1">

        {courses.map((c: any) => (
          <button
            type="button"
            key={c.id}
            onClick={() => toggleCourse(c.id)}
            className={`text-xs sm:text-sm px-3 py-2 rounded-lg border transition-colors ${
              assigned.includes(c.id)
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* SAVE BUTTON */}
  <button
    type="submit"
    className="btn-primary w-full justify-center py-3"
  >
    Save
  </button>
</form>
  );
}
