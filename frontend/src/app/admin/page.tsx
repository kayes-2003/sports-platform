'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { InsightOverview, Match } from '@/types';
import MatchCard from '@/components/MatchCard';
import { Trophy, Users, Calendar, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<InsightOverview | null>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    Promise.all([
      api.insights.overview(),
      api.matches.list({ status: 'live' }),
    ]).then(([ov, lm]) => {
      setOverview(ov);
      setLiveMatches(lm.matches);
    }).catch(console.error);
  }, []);

  const cards = [
    { label: 'Sports', value: overview?.total_sports ?? '–', icon: Trophy, href: '/admin/sports', color: 'text-brand-600 bg-brand-50' },
    { label: 'Total Matches', value: overview?.total_matches ?? '–', icon: Calendar, href: '/admin/matches', color: 'text-blue-600 bg-blue-50' },
    { label: 'Players', value: overview?.total_players ?? '–', icon: Users, href: '/admin/players', color: 'text-green-600 bg-green-50' },
    { label: 'Live Now', value: overview?.live_matches ?? '–', icon: Zap, href: '/admin/matches', color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform stats and quick access</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <div className="card hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {liveMatches.length > 0 && (
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            Live Matches
          </h2>
          <div className="space-y-3">
            {liveMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/matches">
          <div className="card hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-gray-200 flex items-center gap-3 py-6 justify-center">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Schedule a new match</span>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="card hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-gray-200 flex items-center gap-3 py-6 justify-center">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Manage helper accounts</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
