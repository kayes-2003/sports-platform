'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Users, Calendar, BarChart2, Settings, LogOut, LogIn, Menu, X, Zap, Award, UserPlus } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '/',            label: 'Home',        icon: Zap },
  { href: '/matches',     label: 'Matches',     icon: Calendar },
  { href: '/sports',      label: 'Sports',      icon: Trophy },
  { href: '/tournaments', label: 'Tournaments', icon: Award },
  { href: '/players',     label: 'Players',     icon: Users },
  { href: '/insights',    label: 'Insights',    icon: BarChart2 },
];

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); router.push('/'); };

  const roleColor: Record<string, string> = {
    admin:   'bg-purple-100 text-purple-700',
    helper:  'bg-blue-100 text-blue-700',
    visitor: 'bg-green-100 text-green-700',
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
            <Trophy className="w-5 h-5" />
            UniSports
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}>
                <Settings className="w-4 h-4" />Admin
              </Link>
            )}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', roleColor[user.role] || 'bg-gray-100 text-gray-600')}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {user.name[0].toUpperCase()}
                </div>
                <button onClick={handleLogout}
                  className="btn-secondary btn-sm">
                  <LogOut className="w-3.5 h-3.5" />Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"
                  className="btn-secondary btn-sm">
                  <LogIn className="w-3.5 h-3.5" />Sign In
                </Link>
                <Link href="/login?tab=signup"
                  className="btn-primary btn-sm">
                  <UserPlus className="w-3.5 h-3.5" />Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === href ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              )}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Settings className="w-4 h-4" />Admin Panel
            </Link>
          )}
          <div className="border-t border-gray-100 pt-2 mt-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-sm">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                    <div className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize inline-block mt-0.5', roleColor[user.role])}>
                      {user.role}
                    </div>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <LogIn className="w-4 h-4" />Sign In
                </Link>
                <Link href="/login?tab=signup" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-600 hover:bg-brand-50 font-medium">
                  <UserPlus className="w-4 h-4" />Sign Up — Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}