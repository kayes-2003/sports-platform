'use client';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Sport, Team, Match } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import MatchCard from '@/components/MatchCard';
import { Users, ArrowRight } from 'lucide-react';

export default function SportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sport, setSport] = useState<Sport | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.sports.get(id),
      api.matches.list({ sport_id: id }),
    ]).then(([sportData, matchData]) => {
      setSport(sportData.sport);
      setTeams(sportData.teams);
      setMatches(matchData.matches.slice(0, 6));
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card animate-pulse h-64 bg-gray-100" />;
  if (!sport) return <div className="card text-center py-16 text-gray-400">Sport not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex items-center gap-5">
        {sport.logo_url && (
          <Image src={sport.logo_url} alt={sport.name} width={64} height={64} className="rounded-xl object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sport.name}</h1>
          {sport.description && <p className="text-gray-500 text-sm mt-1">{sport.description}</p>}
          <p className="text-xs text-gray-400 mt-1 capitalize">Scoring unit: {sport.scoring_unit}</p>
        </div>
        <Link href={`/insights?sport_id=${id}`} className="btn-secondary ml-auto btn-sm">
          View Insights <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Teams */}
      <div>
        <h2 className="section-title">Teams ({teams.length})</h2>
        {teams.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No teams yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <div className="card hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
                  {team.logo_url ? (
                    <Image src={team.logo_url} alt={team.name} width={40} height={40}
                      className="rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <div className="text-xs text-gray-500">{team.player_count ?? 0} players</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Recent Matches</h2>
          <Link href={`/matches?sport_id=${id}`} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            All matches <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {matches.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No matches yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
