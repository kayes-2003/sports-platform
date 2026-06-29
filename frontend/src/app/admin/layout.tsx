'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Trophy, Users, Calendar, UserCog, Settings, BarChart2, Award } from 'lucide-react';
import clsx from 'clsx';

const adminNav = [
  { href: '/admin', label: 'Overview', icon: BarChart2, exact: true },
  { href: '/admin/sports', label: 'Sports', icon: Trophy },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/matches', label: 'Matches', icon: Calendar },
  { href: '/admin/users', label: 'User Management', icon: UserCog },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Award },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/login');
  }, [loading, isAdmin]);

  if (loading) return <div className="card animate-pulse h-64 bg-gray-100" />;
  if (!isAdmin) return null;

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-52 shrink-0">
        <div className="card p-3 sticky top-20">
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <Settings className="w-4 h-4 text-brand-600" />
            <span className="font-bold text-sm text-gray-900">Admin Panel</span>
          </div>
          <nav className="space-y-0.5">
            {adminNav.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
