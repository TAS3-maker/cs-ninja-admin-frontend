import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, setSession } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('superadmin@csninja.in');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (!['superadmin','teacher','assistant','accountant'].includes(res.user?.role)) {
        toast.error('This account does not have admin access.');
        return;
      }
      setSession(res.accessToken, res.user);
      toast.success(`Welcome ${res.user.name}`);
      nav('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 p-6">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold tracking-tight">CS<span className="text-amber-500">ninja</span> Admin</div>
          <div className="text-sm text-slate-500 mt-1">Sign in to manage your platform</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input !pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input !pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="font-semibold text-slate-700 mb-1">Demo accounts</div>
          <div className="space-y-0.5 font-mono">
            <div>superadmin@csninja.in / Admin@1234</div>
            <div>teacher@csninja.in / Teacher@1234</div>
            <div>assistant@csninja.in / Assist@1234</div>
            <div>accounts@csninja.in / Acct@1234</div>
          </div>
        </div>
      </div>
    </div>
  );
}
