'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Player, Sport } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Search, User } from 'lucide-react';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportId, setSportId] = useState('');

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.players.list({
        ...(search ? { search } : {}),
        ...(sportId ? { sport_id: sportId } : {}),
      });
      setPlayers(data.players);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, sportId]);

  useEffect(() => { api.sports.list().then((d) => setSports(d.sports)); }, []);

  useEffect(() => {
    const t = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(t);
  }, [fetchPlayers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <p className="text-sm text-gray-500 mt-1">Browse all registered players</p>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" className="input pl-9" placeholder="Search players…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-44" value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="card animate-pulse h-40 bg-gray-100" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No players found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((player) => (
            <Link key={player.id} href={`/players/${player.id}`}>
              <div className="card hover:shadow-md transition-shadow cursor-pointer text-center group">
                {player.photo_url ? (
                  <Image src={player.photo_url} alt={player.name} width={72} height={72}
                    className="w-18 h-18 rounded-full mx-auto mb-3 object-cover border-2 border-gray-100" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-50 mx-auto mb-3 flex items-center justify-center">
                    <User className="w-8 h-8 text-brand-200" />
                  </div>
                )}
                <div className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                  {player.name}
                </div>
                {player.jersey_number && (
                  <div className="text-xs text-gray-400 mt-0.5">#{player.jersey_number}</div>
                )}
                <div className="text-xs text-gray-500 mt-1 truncate">{player.team_name}</div>
                {player.position && (
                  <div className="mt-2">
                    <span className="badge bg-brand-50 text-brand-600">{player.position}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">{player.sport_name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
