'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Match, Sport } from '@/types';
import MatchCard from '@/components/MatchCard';
import { Search } from 'lucide-react';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: '🔴 Live', value: 'live' },
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
];

function MatchesContent() {
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sportId, setSportId] = useState('');

  const fetchMatches = async () => {
    setLoading(true);
    try {
      let data;
      if (status === 'today') {
        data = await api.matches.today();
      } else {
        data = await api.matches.list({
          ...(status ? { status } : {}),
          ...(sportId ? { sport_id: sportId } : {}),
        });
      }
      setMatches(data.matches);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { api.sports.list().then((d) => setSports(d.sports)); }, []);
  useEffect(() => { fetchMatches(); }, [status, sportId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
        <p className="text-gray-500 text-sm mt-1">Browse all matches — live, scheduled, and completed</p>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select
          className="input sm:w-48 ml-auto"
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse h-36 bg-gray-100" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No matches found</p>
          <p className="text-sm mt-1">Try a different filter</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="card h-10 animate-pulse bg-gray-100" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card animate-pulse h-36 bg-gray-100" />)}
        </div>
      </div>
    }>
      <MatchesContent />
    </Suspense>
  );
}