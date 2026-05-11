import { useEffect, useState } from 'react';
import { Users as UIcon, BookOpen, ShoppingBag, IndianRupee } from 'lucide-react';
import { api, getStoredUser } from '../api';
import { PageHeader } from '../components/PageHeader';

export default function Dashboard() {
  const u = getStoredUser();
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    if (['superadmin','accountant'].includes(u?.role)) {
      api.analyticsSummary().then((d) => setS(d.totals)).catch(() => {});
    }
  }, []);

  const cards = s ? [
    { label: 'Total Users', value: s.users, icon: UIcon, color: 'bg-indigo-500' },
    { label: 'Students', value: s.students, icon: UIcon, color: 'bg-emerald-500' },
    { label: 'Courses', value: s.courses, icon: BookOpen, color: 'bg-amber-500' },
    { label: 'Paid Orders', value: s.paid_orders, icon: ShoppingBag, color: 'bg-rose-500' },
    { label: 'Revenue (₹)', value: (s.revenue_inr || 0).toLocaleString('en-IN'), icon: IndianRupee, color: 'bg-brand-500', wide: true },
  ] : [];

  return (
    <div className="p-8">
      <PageHeader title={`Welcome, ${u?.name?.split(' ')[0] || 'Admin'}`} subtitle={`You're signed in as ${u?.role}.`} />
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className={`card p-5 ${c.wide ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">{c.label}</div>
                  <div className="text-3xl font-extrabold mt-1">{c.value}</div>
                </div>
                <div className={`w-10 h-10 rounded-lg ${c.color} text-white flex items-center justify-center`}>
                  <c.icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-slate-500">
          You have access to specific sections — use the sidebar to navigate.
        </div>
      )}
    </div>
  );
}
