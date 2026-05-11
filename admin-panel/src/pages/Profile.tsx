import { getStoredUser } from '../api';
import { PageHeader } from '../components/PageHeader';

export default function Profile() {
  const u = getStoredUser();
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Profile" subtitle="Your account information." />
      <div className="card p-6 space-y-3">
        {[['Name', u?.name], ['Email', u?.email], ['Role', u?.role], ['Phone', u?.phone || '—'], ['Permissions', (u?.permissions || []).join(', ') || '—'], ['Assigned Courses', (u?.assigned_courses || []).length]].map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-2 last:pb-0">
            <div className="text-xs uppercase tracking-wider text-slate-500">{k}</div>
            <div className="text-sm font-semibold text-slate-800 break-all">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
