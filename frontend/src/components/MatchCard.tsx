import { Match } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function MatchCard({ match }: { match: Match }) {
  const statusBadge = {
    live: <span className="badge-live">● Live</span>,
    upcoming: <span className="badge-upcoming">Upcoming</span>,
    completed: <span className="badge-completed">Full Time</span>,
    cancelled: <span className="badge bg-yellow-100 text-yellow-700">Cancelled</span>,
  }[match.status];

  return (
    <Link href={`/matches/${match.id}`}>
      <div className={clsx(
        'card hover:shadow-md transition-shadow cursor-pointer',
        match.status === 'live' && 'border-red-200 ring-1 ring-red-100'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {match.sport_logo && (
              <Image src={match.sport_logo} alt={match.sport_name || ''} width={16} height={16} className="rounded" />
            )}
            <span className="text-xs text-gray-500 font-medium">{match.sport_name}</span>
          </div>
          {statusBadge}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center gap-3">
          {/* Home team */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              {match.home_logo && (
                <Image src={match.home_logo} alt={match.home_name || ''} width={28} height={28} className="rounded-full object-cover" />
              )}
              <span className="font-semibold text-sm text-gray-900">{match.home_name}</span>
            </div>
          </div>

          {/* Score */}
          <div className="text-center min-w-[80px]">
            {match.status === 'upcoming' ? (
              <div className="text-xs text-gray-400 font-medium">
                {format(new Date(match.scheduled_at), 'HH:mm')}
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {match.score_home} <span className="text-gray-300 font-light">–</span> {match.score_away}
              </div>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {match.away_logo && (
                <Image src={match.away_logo} alt={match.away_name || ''} width={28} height={28} className="rounded-full object-cover" />
              )}
              <span className="font-semibold text-sm text-gray-900">{match.away_name}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3 text-xs text-gray-400">
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{match.venue}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(match.scheduled_at), 'dd MMM yyyy')}
          </span>
          {match.winner_name && (
            <span className="ml-auto text-green-600 font-medium">🏆 {match.winner_name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
