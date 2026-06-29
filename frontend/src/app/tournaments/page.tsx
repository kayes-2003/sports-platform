'use client';
import { useEffect, useState } from 'react';
import { tournamentsApi } from '@/lib/api';
import { Tournament, Sport } from '@/types';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Trophy, Calendar, MapPin, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const statusColor: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  ongoing:   'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const formatLabel: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin:        'Round Robin',
  group_knockout:     'Group + Knockout',
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSport, setFilterSport] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    api.sports.list().then(d => setSports(d.sports));
  }, []);

  useEffect(() => {
    setLoading(true);
    tournamentsApi.list({
      ...(filterSport ? { sport_id: filterSport } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
    }).then(d => setTournaments(d.tournaments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterSport, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-500 text-white px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Tournaments</h1>
        </div>
        <p className="text-yellow-100">Elimination brackets, round-robins, and group stage tournaments</p>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {['', 'upcoming', 'ongoing', 'completed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filterStatus === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <select className="input sm:w-44 ml-auto" value={filterSport} onChange={e => setFilterSport(e.target.value)}>
          <option value="">All sports</option>
          {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-48 animate-pulse bg-gray-100" />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No tournaments found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map(t => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <div className="card hover:shadow-lg transition-all cursor-pointer group h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className={clsx('badge', statusColor[t.status])}>
                    {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {formatLabel[t.format] || t.format}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors mb-1">
                  {t.name}
                </h3>
                <p className="text-sm text-brand-600 font-medium mb-3">{t.sport_name}</p>

                {t.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-gray-500 mt-auto">
                  {t.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />{t.venue}
                    </div>
                  )}
                  {t.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(t.start_date), 'dd MMM yyyy')}
                      {t.end_date && ` – ${format(new Date(t.end_date), 'dd MMM yyyy')}`}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />{t.team_count ?? 0} teams
                  </div>
                  {t.prize && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span className="text-yellow-600 font-medium">{t.prize}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
