// import { useEffect, useState } from 'react';
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
// import { IndianRupee, ShoppingBag, TrendingUp } from 'lucide-react';
// import { api } from '../api';
// import { PageHeader } from '../components/PageHeader';

// export default function Revenue() {
//   const [summary, setSummary] = useState<any>(null);
//   const [series, setSeries] = useState<any[]>([]);
//   const [top, setTop] = useState<any[]>([]);

//   useEffect(() => {
//     api.analyticsSummary().then((d) => setSummary(d.totals)).catch(() => {});
//     api.analyticsRevenue(30).then((d) => setSeries(d.days)).catch(() => {});
//     api.analyticsTopCourses().then((d) => setTop(d.top_courses)).catch(() => {});
//   }, []);

//   return (
//     <div className="p-8">
//       <PageHeader title="Revenue" subtitle="Sales, orders and top-performing courses." />
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
//         <KpiCard label="Lifetime Revenue (₹)" value={(summary?.revenue_inr || 0).toLocaleString('en-IN')} Icon={IndianRupee} color="bg-brand-500" />
//         <KpiCard label="Paid Orders" value={summary?.paid_orders ?? 0} Icon={ShoppingBag} color="bg-emerald-500" />
//         <KpiCard label="Total Students" value={summary?.students ?? 0} Icon={TrendingUp} color="bg-amber-500" />
//       </div>

//       <div className="card p-6 mb-6">
//         <div className="font-bold mb-3">Revenue, last 30 days</div>
//         {series.length > 0 ? (
//           <ResponsiveContainer width="100%" height={280}>
//             <LineChart data={series}>
//               <XAxis dataKey="date" tick={{ fontSize: 11 }} />
//               <YAxis tick={{ fontSize: 11 }} />
//               <Tooltip />
//               <Line type="monotone" dataKey="amount" stroke="#1a237e" strokeWidth={2} dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         ) : <div className="py-12 text-center text-slate-500 text-sm">No revenue yet.</div>}
//       </div>

//       <div className="card p-6">
//         <div className="font-bold mb-3">Top Courses by Revenue</div>
//         {top.length > 0 ? (
//           <ResponsiveContainer width="100%" height={280}>
//             <BarChart data={top}>
//               <XAxis dataKey="course_id" tick={{ fontSize: 11 }} />
//               <YAxis tick={{ fontSize: 11 }} />
//               <Tooltip />
//               <Legend />
//               <Bar dataKey="amount" fill="#1a237e" name="Revenue (₹)" />
//               <Bar dataKey="orders" fill="#ffc107" name="Orders" />
//             </BarChart>
//           </ResponsiveContainer>
//         ) : <div className="py-12 text-center text-slate-500 text-sm">No paid orders yet.</div>}
//       </div>
//     </div>
//   );
// }

// function KpiCard({ label, value, Icon, color }: any) {
//   return (
//     <div className="card p-5 flex items-center justify-between">
//       <div>
//         <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
//         <div className="text-3xl font-extrabold mt-1">{value}</div>
//       </div>
//       <div className={`w-10 h-10 rounded-lg ${color} text-white flex items-center justify-center`}><Icon size={18} /></div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

import { api } from '../api';
import { PageHeader } from '../components/PageHeader';

export default function Revenue() {

  const [summary, setSummary] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);

  useEffect(() => {

    api.analyticsSummary()
      .then((d) => setSummary(d.totals))
      .catch(() => {});

    api.analyticsRevenue(30)
      .then((d) => setSeries(d.days))
      .catch(() => {});

    api.analyticsTopCourses()
      .then((d) => setTop(d.top_courses))
      .catch(() => {});

  }, []);

  return (

    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">

      {/* HEADER */}
      <PageHeader
        title="Revenue"
        subtitle="Sales, orders and top-performing courses."
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

        <KpiCard
          label="Lifetime Revenue (₹)"
          value={(summary?.revenue_inr || 0).toLocaleString('en-IN')}
          Icon={IndianRupee}
          color="bg-brand-500"
        />

        <KpiCard
          label="Paid Orders"
          value={summary?.paid_orders ?? 0}
          Icon={ShoppingBag}
          color="bg-emerald-500"
        />

        <KpiCard
          label="Total Students"
          value={summary?.students ?? 0}
          Icon={TrendingUp}
          color="bg-amber-500"
        />
      </div>

      {/* LINE CHART */}
      <div className="card p-4 sm:p-5 lg:p-6 mb-6 overflow-hidden">

        <div className="font-bold text-sm sm:text-base mb-4">
          Revenue, last 30 days
        </div>

        {series.length > 0 ? (

          <div className="w-full overflow-x-auto">

            <div className="min-w-[650px] h-[260px] sm:h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <LineChart data={series}>

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#1a237e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        ) : (

          <div className="py-12 text-center text-slate-500 text-sm">
            No revenue yet.
          </div>
        )}
      </div>

      {/* BAR CHART */}
      <div className="card p-4 sm:p-5 lg:p-6 overflow-hidden">

        <div className="font-bold text-sm sm:text-base mb-4">
          Top Courses by Revenue
        </div>

        {top.length > 0 ? (

          <div className="w-full overflow-x-auto">

            <div className="min-w-[650px] h-[260px] sm:h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={top}>

                  <XAxis
                    dataKey="course_id"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="amount"
                    fill="#1a237e"
                    name="Revenue (₹)"
                  />

                  <Bar
                    dataKey="orders"
                    fill="#ffc107"
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        ) : (

          <div className="py-12 text-center text-slate-500 text-sm">
            No paid orders yet.
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  Icon,
  color,
}: any) {

  return (

    <div className="card p-4 sm:p-5 flex items-center justify-between gap-4">

      <div className="min-w-0">

        <div className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 break-words">
          {label}
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold mt-1 break-words">
          {value}
        </div>
      </div>

      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${color} text-white flex items-center justify-center shrink-0`}
      >
        <Icon size={20} />
      </div>
    </div>
  );
}