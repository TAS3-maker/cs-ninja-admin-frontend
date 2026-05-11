import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, GripVertical, ArrowRight, BookOpen, Upload, Loader2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, getStoredUser } from '../api';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

export default function Courses() {
  const me = getStoredUser();
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const isSuperadmin = me?.role === 'superadmin';
  const [faculties, setFaculties] = useState<any[]>([]);

  const load = () => api.listCourses().then((c) => setCourses((c || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))));
  useEffect(() => {
    load();
    api.listFaculties().then((d) => setFaculties(d || [])).catch(() => {});
  }, []);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = courses.findIndex((c) => c.id === active.id);
    const newIdx = courses.findIndex((c) => c.id === over.id);
    const next = arrayMove(courses, oldIdx, newIdx);
    setCourses(next);
    try { await api.reorderCourses(next.map((c) => c.id)); toast.success('Reordered'); }
    catch { toast.error('Reorder failed'); load(); }
  };

  const submit = async (form: any) => {
    try {
      if (editing) await api.updateCourse(editing.id, form);
      else await api.createCourse(form);
      toast.success(editing ? 'Updated' : 'Created');
      setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  const remove = async (c: any) => {
    if (!confirm(`Delete "${c.title}"? This is irreversible.`)) return;
    try { await api.deleteCourse(c.id); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  return (
    // <div className="p-8">
    //   <PageHeader
    //     title="Courses"
    //     subtitle={isSuperadmin ? 'Drag to reorder. Click a course to manage chapters and modules.' : 'Click a course to manage your assigned content.'}
    //     action={isSuperadmin && <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> New Course</button>}
    //   />
    //   {courses.length === 0 && (
    //     <div className="card p-12 text-center">
    //       <BookOpen className="mx-auto text-slate-300" size={42} />
    //       <div className="mt-3 font-bold text-slate-700">No courses yet</div>
    //       <div className="text-sm text-slate-500 mt-1">Click "New Course" to add your first one.</div>
    //     </div>
    //   )}
    //   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
    //     <SortableContext items={courses.map((c) => c.id)} strategy={verticalListSortingStrategy}>
    //       <div className="space-y-3">
    //         {courses.map((c) => (
    //           <CourseRow key={c.id} course={c} canDrag={isSuperadmin} onEdit={() => { setEditing(c); setOpen(true); }} onDelete={() => remove(c)} canDelete={isSuperadmin} />
    //         ))}
    //       </div>
    //     </SortableContext>
    //   </DndContext>
    //   <Modal open={open} title={editing ? 'Edit Course' : 'New Course'} onClose={() => { setOpen(false); setEditing(null); }}>
    //     <CourseForm initial={editing} onSubmit={submit} faculties={faculties} />
    //   </Modal>
    // </div>

    <div className="p-4 sm:p-6 lg:p-8">

  <PageHeader
    title="Courses"
    subtitle={
      isSuperadmin
        ? 'Drag to reorder. Click a course to manage chapters and modules.'
        : 'Click a course to manage your assigned content.'
    }
    action={
      isSuperadmin && (
        <button
          className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2 whitespace-nowrap"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={16} />

          <span className="hidden sm:inline">
            New Course
          </span>
        </button>
      )
    }
  />

  {/* EMPTY STATE */}
  {courses.length === 0 && (

    <div className="card p-6 sm:p-10 lg:p-12 text-center">

      <BookOpen
        className="mx-auto text-slate-300"
        size={36}
      />

      <div className="mt-3 font-bold text-slate-700 text-base sm:text-lg">
        No courses yet
      </div>

      <div className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Click "New Course" to add your first one.
      </div>
    </div>
  )}

  {/* COURSE LIST */}
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={onDragEnd}
  >

    <SortableContext
      items={courses.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
    >

      <div className="space-y-3 sm:space-y-4">

        {courses.map((c) => (

          <div
            key={c.id}
            className="overflow-hidden"
          >
            <CourseRow
              course={c}
              canDrag={isSuperadmin}
              onEdit={() => {
                setEditing(c);
                setOpen(true);
              }}
              onDelete={() => remove(c)}
              canDelete={isSuperadmin}
            />
          </div>
        ))}
      </div>
    </SortableContext>
  </DndContext>

  {/* MODAL */}
  <Modal
    open={open}
    wide
    title={editing ? 'Edit Course' : 'New Course'}
    onClose={() => {
      setOpen(false);
      setEditing(null);
    }}
  >
    <CourseForm
      initial={editing}
      onSubmit={submit}
      faculties={faculties}
    />
  </Modal>
</div>
  );
}

function CourseRow({ course, canDrag, onEdit, onDelete, canDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const chapterCount =
    (course.chapters || []).length ||
    (course.modules || []).reduce((s: number, m: any) => s + (m.chapters || []).length, 0);
  const moduleCount = (course.modules || []).length;
  return (
    // <div ref={setNodeRef} style={style} className="card p-4 flex items-center gap-3">
    //   {canDrag && (
    //     <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing">
    //       <GripVertical size={18} />
    //     </button>
    //   )}
    //   <div className="flex-1">
    //     <div className="font-bold text-slate-900">{course.title}</div>
    //     <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
    //       <span>{course.category}</span>
    //       <span>₹{Number(course.price).toLocaleString('en-IN')}</span>
    //       {moduleCount > 0 && <span>{moduleCount} papers · {chapterCount} chapters</span>}
    //       {moduleCount === 0 && <span>{chapterCount} chapters</span>}
    //     </div>
    //   </div>
    //   <button onClick={onEdit} className="btn-ghost"><Edit2 size={14} /></button>
    //   {canDelete && <button onClick={onDelete} className="btn-ghost text-red-600"><Trash2 size={14} /></button>}
    //   <Link to={`/courses/${course.id}`} className="btn-outline">Manage <ArrowRight size={14} /></Link>
    // </div>

    <div
  ref={setNodeRef}
  style={style}
  className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
>

  {/* LEFT SECTION */}
  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">

    {/* DRAG ICON */}
    {canDrag && (
      <button
        {...attributes}
        {...listeners}
        className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing shrink-0 mt-1 sm:mt-0"
      >
        <GripVertical size={18} />
      </button>
    )}

    {/* COURSE INFO */}
    <div className="min-w-0 flex-1">

      <div className="font-bold text-slate-900 text-sm sm:text-base break-words">
        {course.title}
      </div>

      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">

        <span className="break-words">
          {course.category}
        </span>

        <span>
          ₹{Number(course.price).toLocaleString('en-IN')}
        </span>

        {moduleCount > 0 ? (
          <span>
            {moduleCount} papers · {chapterCount} chapters
          </span>
        ) : (
          <span>
            {chapterCount} chapters
          </span>
        )}
      </div>
    </div>
  </div>

  {/* ACTIONS */}
  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">

    <button
      onClick={onEdit}
      className="btn-ghost shrink-0"
    >
      <Edit2 size={14} />
    </button>

    {canDelete && (
      <button
        onClick={onDelete}
        className="btn-ghost text-red-600 shrink-0"
      >
        <Trash2 size={14} />
      </button>
    )}

    <Link
      to={`/courses/${course.id}`}
      className="btn-outline text-sm shrink-0"
    >
      <span className="hidden xs:inline">
        Manage
      </span>

      <ArrowRight size={14} />
    </Link>
  </div>
</div>
  );
}

// ── Extracted faculty picker so it can use useState properly ──────────────
function FacultyPicker({ faculties, selectedIds, onChange }: { faculties: any[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [search, setSearch] = useState('');

  const unselected = faculties.filter((fac) =>
    !selectedIds.includes(fac.id) &&
    (fac.name.toLowerCase().includes(search.toLowerCase()) ||
     (fac.subject || '').toLowerCase().includes(search.toLowerCase()))
  );
  const selected = faculties.filter((fac) => selectedIds.includes(fac.id));

  return (
    // <div className="border border-slate-200 rounded-xl p-4 space-y-3">
    //   <div>
    //     <label className="label mb-0.5">Course Faculty</label>
    //     <p className="text-[11px] text-slate-500">Search and add. First selected = primary shown in app.</p>
    //   </div>

    //   {/* Search box */}
    //   <div className="relative">
    //     <input
    //       className="input pl-8 text-sm"
    //       placeholder="Search faculty by name or subject…"
    //       value={search}
    //       onChange={(e) => setSearch(e.target.value)}
    //     />
    //     <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    //       <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    //     </svg>
    //     {search && (
    //       <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
    //     )}
    //   </div>

    //   {/* Unselected chips */}
    //   {faculties.length === 0 && <p className="text-slate-400 text-sm italic">No faculty yet — add them on the Faculty page first.</p>}
    //   {unselected.length > 0 && (
    //     <div className="flex flex-wrap gap-2">
    //       {unselected.map((fac) => (
    //         <button type="button" key={fac.id}
    //           onClick={() => { onChange([...selectedIds, fac.id]); setSearch(''); }}
    //           className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-sm text-slate-700">
    //           {fac.avatar
    //             ? <img src={fac.avatar} className="w-5 h-5 rounded-full object-cover" />
    //             : <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">{fac.name.slice(0, 2).toUpperCase()}</div>}
    //           <span className="font-medium">{fac.name}</span>
    //           <span className="text-slate-400 text-xs hidden sm:inline">{fac.subject}</span>
    //           <span className="text-indigo-500 text-xs font-bold ml-1">+</span>
    //         </button>
    //       ))}
    //     </div>
    //   )}
    //   {unselected.length === 0 && search && (
    //     <p className="text-slate-400 text-sm italic">No faculty match "{search}".</p>
    //   )}
    //   {unselected.length === 0 && !search && faculties.length > 0 && (
    //     <p className="text-slate-400 text-sm italic">All faculty selected.</p>
    //   )}

    //   {/* Selected preview cards */}
    //   {selected.length > 0 && (
    //     <div className="space-y-2 pt-1 border-t border-slate-100">
    //       <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pt-1">Selected · {selected.length}</p>
    //       {selected.map((fac, idx) => (
    //         <div key={fac.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${idx === 0 ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
    //           {fac.avatar
    //             ? <img src={fac.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
    //             : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">{fac.name.slice(0, 2).toUpperCase()}</div>}
    //           <div className="flex-1 min-w-0">
    //             <div className="flex items-center gap-2 flex-wrap">
    //               <span className="font-bold text-slate-900 text-sm">{fac.name}</span>
    //               {idx === 0 && <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">PRIMARY</span>}
    //             </div>
    //             <div className="text-xs text-slate-500 mt-0.5">{fac.subject} · ⭐ {fac.rating} · {(fac.students || 0).toLocaleString()} students</div>
    //             {fac.bio && <div className="text-[11px] text-slate-400 truncate mt-0.5">{fac.bio}</div>}
    //           </div>
    //           <div className="flex flex-col gap-1 flex-shrink-0">
    //             {idx > 0 && (
    //               <button type="button"
    //                 onClick={() => { const ids = [...selectedIds]; ids.splice(ids.indexOf(fac.id), 1); onChange([fac.id, ...ids]); }}
    //                 className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-100 whitespace-nowrap">
    //                 ↑ Primary
    //               </button>
    //             )}
    //             <button type="button"
    //               onClick={() => onChange(selectedIds.filter((id) => id !== fac.id))}
    //               className="text-[11px] text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50">
    //               Remove
    //             </button>
    //           </div>
    //         </div>
    //       ))}
    //     </div>
    //   )}
    // </div>

    <div className="border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">

  {/* HEADER */}
  <div>

    <label className="label mb-0.5">
      Course Faculty
    </label>

    <p className="text-[11px] sm:text-xs text-slate-500">
      Search and add. First selected = primary shown in app.
    </p>
  </div>

  {/* SEARCH BOX */}
  <div className="relative">

    <input
      className="input pl-9 pr-8 text-sm"
      placeholder="Search faculty by name or subject…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>

    {search && (
      <button
        type="button"
        onClick={() => setSearch('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
      >
        ✕
      </button>
    )}
  </div>

  {/* EMPTY STATES */}
  {faculties.length === 0 && (
    <p className="text-slate-400 text-sm italic">
      No faculty yet — add them on the Faculty page first.
    </p>
  )}

  {/* UNSELECTED FACULTY */}
  {unselected.length > 0 && (

    <div className="flex flex-wrap gap-2">

      {unselected.map((fac) => (

        <button
          type="button"
          key={fac.id}
          onClick={() => {
            onChange([...selectedIds, fac.id]);
            setSearch('');
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-sm text-slate-700 max-w-full"
        >

          {/* AVATAR */}
          {fac.avatar ? (
            <img
              src={fac.avatar}
              className="w-6 h-6 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
              {fac.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* NAME + SUBJECT */}
          <div className="min-w-0 text-left">

            <div className="font-medium truncate">
              {fac.name}
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block truncate">
              {fac.subject}
            </div>
          </div>

          {/* PLUS */}
          <span className="text-indigo-500 text-xs font-bold ml-1 shrink-0">
            +
          </span>
        </button>
      ))}
    </div>
  )}

  {/* NO RESULTS */}
  {unselected.length === 0 && search && (
    <p className="text-slate-400 text-sm italic">
      No faculty match "{search}".
    </p>
  )}

  {/* ALL SELECTED */}
  {unselected.length === 0 && !search && faculties.length > 0 && (
    <p className="text-slate-400 text-sm italic">
      All faculty selected.
    </p>
  )}

  {/* SELECTED FACULTY */}
  {selected.length > 0 && (

    <div className="space-y-2 pt-2 border-t border-slate-100">

      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        Selected · {selected.length}
      </p>

      {selected.map((fac, idx) => (

        <div
          key={fac.id}
          className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border-2 transition-all ${
            idx === 0
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-white'
          }`}
        >

          {/* LEFT */}
          <div className="flex items-start gap-3 flex-1 min-w-0">

            {/* AVATAR */}
            {fac.avatar ? (
              <img
                src={fac.avatar}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                {fac.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* INFO */}
            <div className="flex-1 min-w-0">

              <div className="flex items-center gap-2 flex-wrap">

                <span className="font-bold text-slate-900 text-sm break-words">
                  {fac.name}
                </span>

                {idx === 0 && (
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                    PRIMARY
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 mt-0.5 break-words">
                {fac.subject} · ⭐ {fac.rating} · {(fac.students || 0).toLocaleString()} students
              </div>

              {fac.bio && (
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {fac.bio}
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center sm:flex-col gap-2 sm:gap-1 shrink-0">

            {idx > 0 && (
              <button
                type="button"
                onClick={() => {
                  const ids = [...selectedIds];
                  ids.splice(ids.indexOf(fac.id), 1);
                  onChange([fac.id, ...ids]);
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-100 whitespace-nowrap"
              >
                ↑ Primary
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onChange(
                  selectedIds.filter((id) => id !== fac.id)
                )
              }
              className="text-[11px] text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 whitespace-nowrap"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
  );
}

function CourseForm({ initial, onSubmit, faculties = [] }: any) {
  const [f, setF] = useState({
    title: initial?.title || '',
    category: initial?.category || 'CSEET',
    price: initial?.price || 0,
    originalPrice: initial?.originalPrice || 0,
    language: initial?.language || 'English',
    level: initial?.level || 'Beginner',
    description: initial?.description || '',
    duration: initial?.duration || '',
    durationDays: initial?.durationDays || 0,
    demoUrl: initial?.demoUrl || initial?.demo_url || '',
    thumbnail: initial?.thumbnail || '',
    highlights: (initial?.highlights || []).join('\n'),
    books: (initial?.books || []).map((b: any) => b.title).join('\n'),
    tags: (initial?.tags || []).join(', '),
    faculty_ids: initial?.faculty_ids || (initial?.faculty?.id ? [initial.faculty.id] : []),
  });

  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const upload = async (file: File, kind: 'video' | 'image', setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      const url = await api.uploadFile(file, kind);
      if (kind === 'video') set('demoUrl', url);
      else set('thumbnail', url);
      toast.success(`${kind === 'video' ? 'Demo video' : 'Thumbnail'} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedFaculties = faculties.filter((fac: any) => f.faculty_ids.includes(fac.id));
    const primaryFaculty = selectedFaculties[0];
    onSubmit({
      ...f,
      price: Number(f.price),
      originalPrice: Number(f.originalPrice),
      durationDays: Number(f.durationDays),
      highlights: f.highlights.split('\n').map((s: string) => s.trim()).filter(Boolean),
      tags: f.tags.split(',').map((s: string) => s.trim()).filter(Boolean),
      books: f.books.split('\n').map((s: string) => s.trim()).filter(Boolean).map((title: string) => ({ title, description: '', included: true })),
      faculty_ids: f.faculty_ids,
      ...(primaryFaculty ? { faculty: { id: primaryFaculty.id, name: primaryFaculty.name, subject: primaryFaculty.subject, rating: primaryFaculty.rating, students: primaryFaculty.students, avatar: primaryFaculty.avatar } } : {}),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Category</label>
          <select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>
            <option>CSEET</option><option>Executive</option><option>Professional</option><option>Foundation</option><option>Other</option>
          </select>
        </div>
        <div><label className="label">Level</label>
          <select className="input" value={f.level} onChange={(e) => set('level', e.target.value)}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Price (₹)</label><input className="input" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} required /></div>
        <div><label className="label">Original Price (₹)</label><input className="input" type="number" value={f.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} /></div>
      </div>
      <div><label className="label">Language</label><input className="input" value={f.language} onChange={(e) => set('language', e.target.value)} /></div>

      <FacultyPicker
        faculties={faculties}
        selectedIds={f.faculty_ids}
        onChange={(ids) => set('faculty_ids', ids)}
      />

      {/* <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Duration</label>
          <input className="input" placeholder="e.g. 3 months / 12 weeks" value={f.duration} onChange={(e) => set('duration', e.target.value)} />
          <div className="text-[11px] text-slate-500 mt-1">Shown on the mobile app instead of start/end dates.</div>
        </div>
        <div>
          <label className="label">Duration (days, optional)</label>
          <input className="input" type="number" min={0} placeholder="e.g. 90" value={f.durationDays} onChange={(e) => set('durationDays', e.target.value)} />
        </div>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

  <div>
    <label className="label">Duration</label>

    <input
      className="input"
      placeholder="e.g. 3 months / 12 weeks"
      value={f.duration}
      onChange={(e) => set('duration', e.target.value)}
    />

    <div className="text-[11px] text-slate-500 mt-1">
      Shown on the mobile app instead of start/end dates.
    </div>
  </div>

  <div>
    <label className="label">Duration (days, optional)</label>

    <input
      className="input"
      type="number"
      min={0}
      placeholder="e.g. 90"
      value={f.durationDays}
      onChange={(e) => set('durationDays', e.target.value)}
    />
  </div>

</div>

      <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>

      <div className="border-t border-slate-200 pt-3">
        <label className="label flex items-center gap-1"><Play size={12} /> Demo / Preview Video</label>
        <div className="flex items-center gap-2">
          <input className="input flex-1" placeholder="Paste a video URL or upload →" value={f.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, 'video', setUploadingDemo); e.currentTarget.value = ''; }} />
          <button type="button" disabled={uploadingDemo} onClick={() => videoRef.current?.click()} className="btn-outline whitespace-nowrap">
            {uploadingDemo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadingDemo ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Shown in the mobile app's "Watch Demo" button before purchase.</div>
      </div>

      <div>
        <label className="label">Thumbnail (optional)</label>
        <div className="flex items-center gap-2">
          <input className="input flex-1" placeholder="Paste an image URL or upload →" value={f.thumbnail} onChange={(e) => set('thumbnail', e.target.value)} />
          <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file, 'image', setUploadingThumb); e.currentTarget.value = ''; }} />
          <button type="button" disabled={uploadingThumb} onClick={() => thumbRef.current?.click()} className="btn-outline whitespace-nowrap">
            {uploadingThumb ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadingThumb ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <label className="label flex items-center gap-1">📦 Physical Books Included (one per line)</label>
        <textarea className="input min-h-[80px]" placeholder={"CS Executive Study Material Vol 1\nCompanies Act Bare Act\nGST Reference Guide"} value={f.books} onChange={(e) => set('books', e.target.value)} />
        <div className="text-[11px] text-slate-500 mt-1">Each line is a book shown as a ✓ feature. Leave empty if none.</div>
      </div>

      <div>
        <label className="label">Course Highlights (one per line)</label>
        <textarea className="input min-h-[100px]" placeholder={"200+ HD Video Lectures\n50+ Chapter Tests\nLive Doubt Sessions"} value={f.highlights} onChange={(e) => set('highlights', e.target.value)} />
        <div className="text-[11px] text-slate-500 mt-1">Each line becomes a bullet point on the course page.</div>
      </div>

      <div>
        <label className="label">Tags (comma-separated)</label>
        <input className="input" placeholder="CSEET, Company Law, Economics, Communication" value={f.tags} onChange={(e) => set('tags', e.target.value)} />
      </div>

      <button type="submit" className="btn-primary w-full justify-center">Save</button>
    </form>
  );
}