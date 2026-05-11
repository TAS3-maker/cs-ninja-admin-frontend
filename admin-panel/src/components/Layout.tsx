// import { NavLink, Outlet, useNavigate } from 'react-router-dom';
// import { LayoutDashboard, Users as UsersIcon, BookOpen, GraduationCap, Sparkles, IndianRupee, LogOut, User as UserIcon, BookText, MessageCircle, Tag } from 'lucide-react';
// import clsx from 'clsx';
// import { clearSession, getStoredUser } from '../api';

// const LINKS = [
//   { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin','teacher','assistant','accountant'] },
//   { to: '/users', icon: UsersIcon, label: 'Users', roles: ['superadmin','teacher'] },
//   { to: '/courses', icon: BookOpen, label: 'Courses', roles: ['superadmin','teacher','assistant'] },
//   { to: '/doubts', icon: MessageCircle, label: 'Doubts', roles: ['superadmin','teacher','assistant'] },
//   { to: '/coupons', icon: Tag, label: 'Coupons', roles: ['superadmin'] },
//   { to: '/faculty', icon: GraduationCap, label: 'Faculty', roles: ['superadmin'] },
//   { to: '/experts', icon: Sparkles, label: 'Experts', roles: ['superadmin'] },
//   { to: '/revenue', icon: IndianRupee, label: 'Revenue', roles: ['superadmin','accountant'] },
// ];

// export default function Layout() {
//   const nav = useNavigate();
//   const u = getStoredUser();
//   const links = LINKS.filter((l) => l.roles.includes(u?.role));

//   const onLogout = () => { clearSession(); nav('/login', { replace: true }); };

//   return (
//     <div className="min-h-screen flex bg-slate-50">
//       <aside className="w-60 bg-brand-500 text-white flex flex-col shrink-0">
//         <div className="px-6 py-5 border-b border-white/10">
//           <div className="text-xl font-extrabold tracking-tight">CS<span className="text-amber-300">ninja</span></div>
//           <div className="text-[11px] uppercase tracking-widest text-white/60 mt-0.5">Admin Panel</div>
//         </div>
//         <nav className="flex-1 px-3 py-4 space-y-1">
//           {links.map((l) => (
//             <NavLink
//               key={l.to}
//               to={l.to}
//               end={l.to === '/'}
//               className={({ isActive }) =>
//                 clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
//                   isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white')
//               }
//             >
//               <l.icon size={18} />
//               {l.label}
//             </NavLink>
//           ))}
//           <a
//             href="/api/docs"
//             target="_blank"
//             rel="noreferrer"
//             className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
//           >
//             <BookText size={18} />
//             API Docs
//           </a>
//         </nav>
//         <div className="p-3 border-t border-white/10">
//           <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/85 hover:bg-white/10">
//             <UserIcon size={18} />
//             <div className="flex-1 min-w-0">
//               <div className="text-sm font-semibold truncate">{u?.name}</div>
//               <div className="text-[10px] uppercase tracking-wider text-white/60">{u?.role}</div>
//             </div>
//           </NavLink>
//           <button onClick={onLogout} className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10">
//             <LogOut size={18} /> Logout
//           </button>
//         </div>
//       </aside>
//       <main className="flex-1 overflow-auto">
//         <Outlet />
//       </main>
//     </div>
//   );
// }

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users as UsersIcon, BookOpen, GraduationCap, Sparkles, IndianRupee, LogOut, User as UserIcon, BookText, MessageCircle, Tag, Menu, X,
} from 'lucide-react';

import clsx from 'clsx';
import { clearSession, getStoredUser } from '../api';

const LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin', 'teacher', 'assistant', 'accountant'] },
  { to: '/users', icon: UsersIcon, label: 'Users', roles: ['superadmin', 'teacher'] },
  { to: '/courses', icon: BookOpen, label: 'Courses', roles: ['superadmin', 'teacher', 'assistant'] },
  { to: '/doubts', icon: MessageCircle, label: 'Doubts', roles: ['superadmin', 'teacher', 'assistant'] },
  { to: '/coupons', icon: Tag, label: 'Coupons', roles: ['superadmin'] },
  { to: '/faculty', icon: GraduationCap, label: 'Faculty', roles: ['superadmin'] },
  { to: '/experts', icon: Sparkles, label: 'Experts', roles: ['superadmin'] },
  { to: '/revenue', icon: IndianRupee, label: 'Revenue', roles: ['superadmin', 'accountant'] },
];

export default function Layout() {
  const nav = useNavigate();
  const u = getStoredUser();

  const [open, setOpen] = useState(false);

  const links = LINKS.filter((l) => l.roles.includes(u?.role));

  const onLogout = () => {
    clearSession();
    nav('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* MOBILE SIDEBAR */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">

          {/* OVERLAY */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* DRAWER */}
          <aside className="relative w-64 bg-brand-500 text-white flex flex-col h-full z-50">

            {/* HEADER */}
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">

              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  CS<span className="text-amber-300">ninja</span>
                </div>

                <div className="text-[11px] uppercase tracking-widest text-white/60 mt-0.5">
                  Admin Panel
                </div>
              </div>

              <button onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <l.icon size={18} />
                  {l.label}
                </NavLink>
              ))}

              <a
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
              >
                <BookText size={18} />
                API Docs
              </a>
            </nav>

            {/* PROFILE */}
            <div className="p-3 border-t border-white/10">

              <NavLink
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/85 hover:bg-white/10"
              >
                <UserIcon size={18} />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {u?.name}
                  </div>

                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    {u?.role}
                  </div>
                </div>
              </NavLink>

              <button
                onClick={onLogout}
                className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* TABLET + DESKTOP SIDEBAR */}
      <aside className="hidden md:flex bg-brand-500 text-white flex-col shrink-0 lg:w-60 md:w-24 transition-all duration-300">

        {/* LOGO */}
        <div className="px-4 lg:px-6 py-5 border-b border-white/10">

          <div className="text-xl font-extrabold tracking-tight">
            CS<span className="text-amber-300">ninja</span>
          </div>

          <div className="hidden lg:block text-[11px] uppercase tracking-widest text-white/60 mt-0.5">
            Admin Panel
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1 overflow-y-auto">

          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center lg:justify-start justify-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <l.icon size={18} />

              <span className="hidden lg:block">
                {l.label}
              </span>
            </NavLink>
          ))}

          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center lg:justify-start justify-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
          >
            <BookText size={18} />

            <span className="hidden lg:block">
              API Docs
            </span>
          </a>
        </nav>

        {/* PROFILE */}
        <div className="p-3 border-t border-white/10">

          <NavLink
            to="/profile"
            className="flex items-center lg:justify-start justify-center gap-3 px-3 py-2 rounded-lg text-white/85 hover:bg-white/10"
          >
            <UserIcon size={18} />

            <div className="hidden lg:block flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {u?.name}
              </div>

              <div className="text-[10px] uppercase tracking-wider text-white/60">
                {u?.role}
              </div>
            </div>
          </NavLink>

          <button
            onClick={onLogout}
            className="mt-1 w-full flex items-center lg:justify-start justify-center gap-3 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10"
          >
            <LogOut size={18} />

            <span className="hidden lg:block">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* MOBILE TOPBAR */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-brand-500 text-white shadow-sm">

          <button onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="text-lg font-bold tracking-tight">
            CS<span className="text-amber-300">ninja</span>
          </div>

          <div className="w-6" />
        </div>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}