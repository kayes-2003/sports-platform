'use client';
import { useEffect, useState } from 'react';
import { api, tournamentsApi } from '@/lib/api';
import { Match, InsightOverview, Tournament } from '@/types';
import MatchCard from '@/components/MatchCard';
import { Trophy, Users, Calendar, Zap, ArrowRight, Award, MapPin } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import clsx from 'clsx';

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing:  'bg-green-100 text-green-700',
  completed:'bg-gray-100 text-gray-600',
};

export default function HomePage() {
  const [liveMatches,     setLiveMatches]     = useState<Match[]>([]);
  const [todayMatches,    setTodayMatches]    = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [tournaments,     setTournaments]     = useState<Tournament[]>([]);
  const [overview,        setOverview]        = useState<InsightOverview | null>(null);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.matches.list({ status: 'live' }),
      api.matches.today(),
      api.matches.list({ status: 'upcoming' }),
      api.insights.overview(),
      tournamentsApi.list({ status: 'ongoing' }),
    ]).then(([live, today, upcoming, ov, tours]) => {
      setLiveMatches(live.matches);
      setTodayMatches(today.matches);
      setUpcomingMatches(upcoming.matches.slice(0, 4));
      setOverview(ov);
      setTournaments(tours.tournaments.slice(0, 3));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Sports',       value: overview?.total_sports  ?? '–', icon: Trophy,   color: 'text-brand-600 bg-brand-50' },
    { label: 'Total Matches',value: overview?.total_matches ?? '–', icon: Calendar,  color: 'text-blue-600 bg-blue-50' },
    { label: 'Players',      value: overview?.total_players ?? '–', icon: Users,     color: 'text-green-600 bg-green-50' },
    { label: 'Live Now',     value: overview?.live_matches  ?? '–', icon: Zap,       color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 text-white px-8 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold mb-2">University Sports Hub</h1>
          <p className="text-brand-100 text-base">Live scores, brackets, player profiles, match history and insights — all in one place.</p>
          <div className="flex gap-3 mt-5">
            <Link href="/matches" className="bg-white text-brand-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-brand-50 transition-colors">
              View Matches
            </Link>
            <Link href="/tournaments" className="border border-white/40 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Tournaments
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tournaments */}
      {tournaments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-600" />Active Tournaments
            </h2>
            <Link href="/tournaments" className="text-sm text-brand-600 flex items-center gap-1 hover:underline">
              All tournaments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <div className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx('badge', statusColor[t.status])}>{t.status}</span>
                    <span className="text-xs text-gray-400 capitalize">{t.format?.replace('_',' ')}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{t.name}</h3>
                  <p className="text-xs text-brand-600">{t.sport_name}</p>
                  {t.venue && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{t.venue}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              Live Now
            </h2>
            <Link href="/matches?status=live" className="text-sm text-brand-600 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Today's Matches */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Today's Matches</h2>
          <Link href="/matches" className="text-sm text-brand-600 flex items-center gap-1 hover:underline">
            Full schedule <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="card animate-pulse h-32 bg-gray-100" />)}
          </div>
        ) : todayMatches.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No matches scheduled for today.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {todayMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">Upcoming Fixtures</h2>
            <Link href="/matches?status=upcoming" className="text-sm text-brand-600 flex items-center gap-1 hover:underline">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
