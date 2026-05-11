import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Power, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';

const http = axios.create({ baseURL: '/api', timeout: 30_000 });
http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('admin_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function Coupons() {
  const [list, setList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () => http.get('/admin/coupons').then((r) => setList(r.data.coupons || [])).catch(() => {});
  useEffect(() => {
    load();
    http.get('/admin/courses').then((r) => setCourses(r.data.courses || [])).catch(() => {});
  }, []);

  const submit = async (form: any) => {
    try {
      if (editing) await http.patch(`/admin/coupons/${editing.id}`, form);
      else await http.post('/admin/coupons', form);
      toast.success('Saved'); setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  const remove = async (c: any) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await http.delete(`/admin/coupons/${c.id}`); load(); toast.success('Deleted');
  };

  const toggleActive = async (c: any) => {
    await http.patch(`/admin/coupons/${c.id}`, { ...c, is_active: !c.is_active });
    load();
  };

  return (
    // <div className="p-8">
    //   <PageHeader
    //     title="Coupons"
    //     subtitle="Promo codes that students can apply at checkout."
    //     action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> New Coupon</button>}
    //   />

    //   <div className="card overflow-hidden">
    //     <table className="w-full text-sm">
    //       <thead className="bg-slate-50 border-b border-slate-200">
    //         <tr className="text-left">
    //           <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Discount</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Applies to</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Usage</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
    //           <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {list.map((c) => {
    //           const usage = c.max_redemptions ? `${c.used_count || 0} / ${c.max_redemptions}` : `${c.used_count || 0} / ∞`;
    //           const courseLabel =
    //             !c.applicable_courses || c.applicable_courses.length === 0
    //               ? 'All courses'
    //               : c.applicable_courses.map((id: string) => courses.find((cc) => cc.id === id)?.title || id).join(', ');
    //           return (
    //             <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
    //               <td className="px-4 py-3">
    //                 <div className="flex items-center gap-2">
    //                   <Tag size={14} className="text-brand-500" />
    //                   <span className="font-mono font-bold tracking-wider">{c.code}</span>
    //                   <button
    //                     onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied'); }}
    //                     className="text-slate-400 hover:text-slate-700">
    //                     <Copy size={12} />
    //                   </button>
    //                 </div>
    //                 {c.description && <div className="text-xs text-slate-500 mt-0.5 ml-6">{c.description}</div>}
    //               </td>
    //               <td className="px-4 py-3 font-bold text-emerald-600">{c.discount_pct}%</td>
    //               <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={courseLabel}>{courseLabel}</td>
    //               <td className="px-4 py-3 text-slate-600">{usage}</td>
    //               <td className="px-4 py-3">
    //                 <button
    //                   onClick={() => toggleActive(c)}
    //                   className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 ${
    //                     c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
    //                   }`}>
    //                   <Power size={11} />
    //                   {c.is_active ? 'Active' : 'Disabled'}
    //                 </button>
    //               </td>
    //               <td className="px-4 py-3 text-right space-x-2">
    //                 <button className="btn-ghost" onClick={() => { setEditing(c); setOpen(true); }}><Edit2 size={14} /></button>
    //                 <button className="btn-ghost text-red-600" onClick={() => remove(c)}><Trash2 size={14} /></button>
    //               </td>
    //             </tr>
    //           );
    //         })}
    //         {list.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No coupons yet.</td></tr>}
    //       </tbody>
    //     </table>
    //   </div>

    //   <Modal open={open} title={editing ? 'Edit Coupon' : 'New Coupon'} onClose={() => { setOpen(false); setEditing(null); }}>
    //     <CouponForm initial={editing} courses={courses} onSubmit={submit} />
    //   </Modal>
    // </div>
    
    <div className="p-4 sm:p-6 lg:p-8">
  <PageHeader
    title="Coupons"
    subtitle="Promo codes that students can apply at checkout."
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
          New Coupon
        </span>
      </button>
    }
  />

  {/* DESKTOP + TABLET */}
  <div className="hidden md:block card overflow-x-auto">

    <table className="w-full min-w-[900px] text-sm">

      <thead className="bg-slate-50 border-b border-slate-200">

        <tr className="text-left">

          <th className="px-4 py-3 font-semibold text-slate-700">
            Code
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Discount
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Applies to
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Usage
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700">
            Status
          </th>

          <th className="px-4 py-3 font-semibold text-slate-700 text-right">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>

        {list.map((c) => {

          const usage = c.max_redemptions
            ? `${c.used_count || 0} / ${c.max_redemptions}`
            : `${c.used_count || 0} / ∞`;

          const courseLabel =
            !c.applicable_courses || c.applicable_courses.length === 0
              ? 'All courses'
              : c.applicable_courses
                  .map(
                    (id: string) =>
                      courses.find((cc) => cc.id === id)?.title || id
                  )
                  .join(', ');

          return (
            <tr
              key={c.id}
              className="border-b border-slate-100 hover:bg-slate-50"
            >

              {/* CODE */}
              <td className="px-4 py-3">

                <div className="flex items-center gap-2">

                  <Tag
                    size={14}
                    className="text-brand-500 shrink-0"
                  />

                  <span className="font-mono font-bold tracking-wider">
                    {c.code}
                  </span>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(c.code);
                      toast.success('Copied');
                    }}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <Copy size={13} />
                  </button>
                </div>

                {c.description && (
                  <div className="text-xs text-slate-500 mt-1 ml-6">
                    {c.description}
                  </div>
                )}
              </td>

              {/* DISCOUNT */}
              <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">
                {c.discount_pct}%
              </td>

              {/* APPLIES TO */}
              <td
                className="px-4 py-3 text-slate-600 max-w-xs truncate"
                title={courseLabel}
              >
                {courseLabel}
              </td>

              {/* USAGE */}
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {usage}
              </td>

              {/* STATUS */}
              <td className="px-4 py-3">

                <button
                  onClick={() => toggleActive(c)}
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 ${
                    c.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Power size={11} />

                  {c.is_active ? 'Active' : 'Disabled'}
                </button>
              </td>

              {/* ACTIONS */}
              <td className="px-4 py-3">

                <div className="flex items-center justify-end gap-2">

                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Edit2 size={18} />
                  </button>

                  <button
                    className="btn-ghost text-red-600"
                    onClick={() => remove(c)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}

        {list.length === 0 && (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-12 text-center text-slate-500"
            >
              No coupons yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

 {/* MOBILE VIEW */}
<div className="md:hidden space-y-4">

  {list.map((c) => {

    const usage = c.max_redemptions
      ? `${c.used_count || 0} / ${c.max_redemptions}`
      : `${c.used_count || 0} / ∞`;

    const courseLabel =
      !c.applicable_courses || c.applicable_courses.length === 0
        ? 'All courses'
        : c.applicable_courses
            .map(
              (id: string) =>
                courses.find((cc) => cc.id === id)?.title || id
            )
            .join(', ');

    return (
      <div
        key={c.id}
        className="card p-4"
      >

        <div className="grid grid-cols-[100px_1fr] gap-y-4 text-sm">

          {/* CODE */}
          <div className="font-semibold text-slate-700">
            Code
          </div>

          <div>

            <div className="flex items-center gap-2 flex-wrap">

              <Tag
                size={13}
                className="text-brand-500 shrink-0"
              />

              <span className="font-mono font-bold tracking-wider break-all">
                {c.code}
              </span>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(c.code);
                  toast.success('Copied');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <Copy size={13} />
              </button>
            </div>

            {c.description && (
              <div className="text-xs text-slate-500 mt-1">
                {c.description}
              </div>
            )}
          </div>

          {/* DISCOUNT */}
          <div className="font-semibold text-slate-700">
            Discount
          </div>

          <div className="font-bold text-emerald-600">
            {c.discount_pct}%
          </div>

          {/* APPLIES */}
          <div className="font-semibold text-slate-700">
            Applies To
          </div>

          <div className="text-slate-600 break-words">
            {courseLabel}
          </div>

          {/* USAGE */}
          <div className="font-semibold text-slate-700">
            Usage
          </div>

          <div className="text-slate-600">
            {usage}
          </div>

          {/* STATUS */}
          <div className="font-semibold text-slate-700">
            Status
          </div>

          <div>

            <button
              onClick={() => toggleActive(c)}
              className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 ${
                c.is_active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Power size={11} />

              {c.is_active ? 'Active' : 'Disabled'}
            </button>
          </div>

          {/* ACTIONS */}
          <div className="font-semibold text-slate-700">
            Actions
          </div>

          <div className="flex items-center gap-2">

            <button
              className="btn-ghost"
              onClick={() => {
                setEditing(c);
                setOpen(true);
              }}
            >
              <Edit2 size={18} />
            </button>

            <button
              className="btn-ghost text-red-600"
              onClick={() => remove(c)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  })}

  {list.length === 0 && (
    <div className="card p-10 text-center text-slate-500">
      No coupons yet.
    </div>
  )}
</div>

  <Modal
    open={open}
    title={editing ? 'Edit Coupon' : 'New Coupon'}
    onClose={() => {
      setOpen(false);
      setEditing(null);
    }}
  >
    <CouponForm
      initial={editing}
      courses={courses}
      onSubmit={submit}
    />
  </Modal>
</div>
  );
}

function CouponForm({ initial, courses, onSubmit }: any) {
  const [f, setF] = useState({
    code: initial?.code || '',
    description: initial?.description || '',
    discount_pct: initial?.discount_pct || 10,
    max_redemptions: initial?.max_redemptions || '',
    expiry: initial?.expiry || '',
    applicable_courses: initial?.applicable_courses || [],
    min_amount: initial?.min_amount || 0,
    is_active: initial?.is_active ?? true,
  });
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const toggleCourse = (id: string) =>
    set('applicable_courses', f.applicable_courses.includes(id) ? f.applicable_courses.filter((c: string) => c !== id) : [...f.applicable_courses, id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...f,
      code: f.code.trim().toUpperCase(),
      discount_pct: Number(f.discount_pct),
      max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : null,
      min_amount: Number(f.min_amount),
      expiry: f.expiry || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Code</label>
          <input className="input font-mono uppercase" value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="WELCOME10" required disabled={!!initial} />
        </div>
        <div>
          <label className="label">Discount %</label>
          <input className="input" type="number" min={1} max={100} value={f.discount_pct} onChange={(e) => set('discount_pct', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="10% off your first course" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Max Redemptions (blank = ∞)</label>
          <input className="input" type="number" min={1} value={f.max_redemptions} onChange={(e) => set('max_redemptions', e.target.value)} />
        </div>
        <div>
          <label className="label">Min Order ₹</label>
          <input className="input" type="number" min={0} value={f.min_amount} onChange={(e) => set('min_amount', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Expiry (ISO date, blank = no expiry)</label>
        <input className="input" type="date" value={f.expiry?.slice(0, 10) || ''} onChange={(e) => set('expiry', e.target.value)} />
      </div>
      <div>
        <label className="label">Applies to (blank = ALL courses)</label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-auto bg-slate-50 p-2 rounded-lg">
          {courses.map((c: any) => (
            <button type="button" key={c.id} onClick={() => toggleCourse(c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${f.applicable_courses.includes(c.id) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-300'}`}>{c.title}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        Active
      </label>
      <button type="submit" className="btn-primary w-full justify-center">Save</button>
    </form>
  );
}
