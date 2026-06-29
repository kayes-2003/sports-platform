'use client';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Team, Player, Match } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import { User, Shield } from 'lucide-react';

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.teams.get(id).then((d) => {
      setTeam(d.team);
      setPlayers(d.players);
      setRecentMatches(d.recent_matches);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card animate-pulse h-64 bg-gray-100" />;
  if (!team) return <div className="card text-center py-16 text-gray-400">Team not found.</div>;

  const wins = recentMatches.filter((m) => m.winner_team_id === id).length;
  const losses = recentMatches.filter((m) => m.winner_team_id && m.winner_team_id !== id).length;
  const draws = recentMatches.filter((m) => m.status === 'completed' && !m.winner_team_id).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Team header */}
      <div className="card flex items-center gap-5">
        {team.logo_url ? (
          <Image src={team.logo_url} alt={team.name} width={72} height={72}
            className="rounded-full object-cover border-2 border-gray-100" />
        ) : (
          <div className="w-18 h-18 rounded-full bg-brand-50 flex items-center justify-center w-16 h-16">
            <Shield className="w-9 h-9 text-brand-200" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <Link href={`/sports/${team.sport_id}`} className="text-sm text-brand-600 hover:underline">
            {team.sport_name}
          </Link>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-green-600 font-semibold">{wins}W</span>
            <span className="text-red-500 font-semibold">{losses}L</span>
            <span className="text-gray-400 font-semibold">{draws}D</span>
            <span className="text-gray-400">({recentMatches.length} recent)</span>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="card">
        <h2 className="section-title">Players ({players.length})</h2>
        {players.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No players registered.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {players.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  {p.photo_url ? (
                    <Image src={p.photo_url} alt={p.name} width={36} height={36}
                      className="rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-brand-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.position || 'Player'}</div>
                  </div>
                  {p.jersey_number && (
                    <span className="text-xs text-gray-400 font-mono">#{p.jersey_number}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent matches */}
      <div>
        <h2 className="section-title">Recent Matches</h2>
        {recentMatches.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">No completed matches yet.</div>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
