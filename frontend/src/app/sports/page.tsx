'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Sport } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Users, Shield } from 'lucide-react';

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sports.list()
      .then((d) => setSports(d.sports))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card h-32 animate-pulse bg-gray-100" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sports</h1>
        <p className="text-sm text-gray-500 mt-1">Browse all sports and their teams</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sports.map((sport) => (
          <Link key={sport.id} href={`/sports/${sport.id}`}>
            <div className="card hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                {sport.logo_url ? (
                  <Image src={sport.logo_url} alt={sport.name} width={48} height={48}
                    className="rounded-xl object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-brand-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {sport.name}
                  </h3>
                  {sport.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sport.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />{sport.team_count ?? 0} teams
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />{sport.player_count ?? 0} players
                </span>
                <span className="ml-auto text-gray-400 capitalize">{sport.scoring_unit}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
