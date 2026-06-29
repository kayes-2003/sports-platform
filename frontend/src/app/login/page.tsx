'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';

type Tab = 'signin' | 'signup';

export default function AuthPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('signin');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Read ?tab=signup from URL (e.g. from navbar Sign Up button)
  useEffect(() => {
    if (searchParams.get('tab') === 'signup') setTab('signup');
  }, [searchParams]);

  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(signInForm.email, signInForm.password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(''); setSuccess('');
  if (signUpForm.password !== signUpForm.confirmPassword) {
    setError('Passwords do not match'); return;
  }
  if (signUpForm.password.length < 6) {
    setError('Password must be at least 6 characters'); return;
  }
  setLoading(true);
  try {
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: signUpForm.name,
        email: signUpForm.email,
        password: signUpForm.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setSuccess('Account created successfully! You can now sign in.');
    setTab('signin');
    setSignInForm({ email: signUpForm.email, password: '' });
    setSignUpForm({ name: '', email: '', password: '', confirmPassword: '' });
  } catch (err: any) {
    setError(err.message || 'Registration failed');
  } finally { setLoading(false); }
};

  return (
    <div className="min-h-[75vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="card shadow-lg">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">UniSports</h1>
            <p className="text-sm text-gray-500 mt-1">University Central Sports Platform</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm flex items-center gap-2">
              ✅ {success}
            </div>
          )}

          {/* Sign In */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required className="input pl-9"
                    placeholder="you@university.edu"
                    value={signInForm.email}
                    onChange={e => setSignInForm({ ...signInForm, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} required className="input pl-9 pr-10"
                    placeholder="••••••••"
                    value={signInForm.password}
                    onChange={e => setSignInForm({ ...signInForm, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <p className="text-center text-sm text-gray-500">
                No account?{' '}
                <button type="button" onClick={() => setTab('signup')}
                  className="text-brand-600 font-semibold hover:underline">
                  Sign Up free
                </button>
              </p>
            </form>
          )}

          {/* Sign Up */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required className="input pl-9"
                    placeholder="Your full name"
                    value={signUpForm.name}
                    onChange={e => setSignUpForm({ ...signUpForm, name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required className="input pl-9"
                    placeholder="you@university.edu"
                    value={signUpForm.email}
                    onChange={e => setSignUpForm({ ...signUpForm, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} required className="input pl-9 pr-10"
                    placeholder="At least 6 characters"
                    value={signUpForm.password}
                    onChange={e => setSignUpForm({ ...signUpForm, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} required className="input pl-9"
                    placeholder="Re-enter your password"
                    value={signUpForm.confirmPassword}
                    onChange={e => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Creating account…' : 'Create Free Account'}
              </button>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p>✅ New accounts get <strong>Visitor</strong> access — view all matches, scores, players and tournaments.</p>
                <p>🔒 To update scores or manage data, contact the admin to upgrade your role.</p>
              </div>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('signin')}
                  className="text-brand-600 font-semibold hover:underline">
                  Sign In
                </button>
              </p>
            </form>
          )}

          {/* Demo creds */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center space-y-0.5">
            <div>Demo admin: <strong>admin@sports.edu</strong> / <strong>admin123</strong></div>
            <div>Demo helper: <strong>helper@sports.edu</strong> / <strong>helper123</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}