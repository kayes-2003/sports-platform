'use client';
import { use, useEffect, useState } from 'react';
import { tournamentsApi } from '@/lib/api';
import { Tournament, TournamentTeam, BracketRound, BracketMatch } from '@/types';
import BracketTree from '@/components/BracketTree';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Trophy, Users, Shield, RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';

const statusColor: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  ongoing:   'bg-green-100 text-green-700 animate-pulse',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAdmin, canEdit } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [bracket, setBracket] = useState<BracketRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bracket' | 'teams'>('bracket');

  // Result modal
  const [resultMatch, setResultMatch] = useState<BracketMatch | null>(null);
  const [resultForm, setResultForm] = useState({ winner_id: '', score_home: '', score_away: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await tournamentsApi.get(id);
      setTournament(d.tournament);
      setTeams(d.teams);
      setBracket(d.bracket);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerateBracket = async () => {
    setGenerating(true);
    try {
      const d = await tournamentsApi.generateBracket(id);
      setBracket(d.bracket);
    } catch (e: any) { alert(e.message); }
    finally { setGenerating(false); }
  };

  const handleMatchClick = (match: BracketMatch) => {
    setResultMatch(match);
    setResultForm({
      winner_id: match.winner_id || '',
      score_home: match.score_home?.toString() || '0',
      score_away: match.score_away?.toString() || '0',
    });
  };

  const handleSaveResult = async () => {
    if (!resultMatch || !resultForm.winner_id) {
      alert('Please select a winner');
      return;
    }
    setSaving(true);
    try {
      await tournamentsApi.setResult(id, resultMatch.id, {
        winner_id: resultForm.winner_id,
        score_home: parseInt(resultForm.score_home) || 0,
        score_away: parseInt(resultForm.score_away) || 0,
      });
      setResultMatch(null);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="card h-40 bg-gray-100" />
      <div className="card h-96 bg-gray-100" />
    </div>
  );

  if (!tournament) return <div className="card text-center py-16 text-gray-400">Tournament not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <span className={clsx('badge', statusColor[tournament.status])}>
                {tournament.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
              <Link href={`/sports/${tournament.sport_id}`} className="text-brand-600 font-medium hover:underline">
                {tournament.sport_name}
              </Link>
              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium capitalize">
                {tournament.format?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              {tournament.venue && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tournament.venue}</span>
              )}
              {tournament.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(tournament.start_date), 'dd MMM yyyy')}
                  {tournament.end_date && ` – ${format(new Date(tournament.end_date), 'dd MMM yyyy')}`}
                </span>
              )}
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{teams.length} teams</span>
            </div>
            {tournament.prize && (
              <div className="mt-2 text-sm text-yellow-600 font-medium flex items-center gap-1">
                🏆 Prize: {tournament.prize}
              </div>
            )}
            {tournament.description && (
              <p className="mt-2 text-sm text-gray-500">{tournament.description}</p>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={handleGenerateBracket} disabled={generating}
                className="btn-primary btn-sm">
                <RefreshCw className={clsx('w-3.5 h-3.5', generating && 'animate-spin')} />
                {generating ? 'Generating…' : bracket.length > 0 ? 'Regenerate' : 'Generate Bracket'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['bracket', 'teams'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}>
            {tab === 'bracket' ? '🏆 Bracket' : '🛡️ Teams'}
          </button>
        ))}
      </div>

      {/* Bracket tab */}
      {activeTab === 'bracket' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">
              {tournament.format === 'round_robin' ? 'Round Robin Schedule' : 'Elimination Bracket'}
            </h2>
            {canEdit && bracket.length > 0 && (
              <p className="text-xs text-gray-400">Click any match to enter result</p>
            )}
          </div>
          <BracketTree
            bracket={bracket}
            onMatchClick={handleMatchClick}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* Teams tab */}
      {activeTab === 'teams' && (
        <div className="card">
          <h2 className="section-title">Registered Teams ({teams.length})</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No teams registered.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teams.map(t => (
                <Link key={t.id} href={`/teams/${t.team_id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {t.seed}
                    </div>
                    {t.team_logo ? (
                      <Image src={t.team_logo} alt={t.team_name} width={32} height={32}
                        className="rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <span className="font-medium text-sm text-gray-900 truncate">{t.team_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result entry modal */}
      {resultMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResultMatch(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Enter Match Result</h3>
              <button onClick={() => setResultMatch(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              {resultMatch.round_name} · Slot {resultMatch.slot_number}
            </div>

            {/* Score inputs */}
            <div className="grid grid-cols-3 gap-3 items-center mb-4">
              <div className="text-center">
                <div className="font-semibold text-sm text-gray-900 mb-2 truncate">{resultMatch.home_name || 'Team 1'}</div>
                <input type="number" min={0} className="input text-center text-xl font-bold"
                  value={resultForm.score_home}
                  onChange={e => setResultForm({ ...resultForm, score_home: e.target.value })} />
              </div>
              <div className="text-center text-gray-400 font-bold text-lg">VS</div>
              <div className="text-center">
                <div className="font-semibold text-sm text-gray-900 mb-2 truncate">{resultMatch.away_name || 'Team 2'}</div>
                <input type="number" min={0} className="input text-center text-xl font-bold"
                  value={resultForm.score_away}
                  onChange={e => setResultForm({ ...resultForm, score_away: e.target.value })} />
              </div>
            </div>

            {/* Winner select */}
            <div className="mb-5">
              <label className="label">Winner *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: resultMatch.team_home_id, name: resultMatch.home_name },
                  { id: resultMatch.team_away_id, name: resultMatch.away_name },
                ].filter(t => t.id).map(t => (
                  <button key={t.id} onClick={() => setResultForm({ ...resultForm, winner_id: t.id! })}
                    className={clsx(
                      'py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all',
                      resultForm.winner_id === t.id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-brand-300'
                    )}>
                    {resultForm.winner_id === t.id ? '✓ ' : ''}{t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveResult} disabled={saving || !resultForm.winner_id}
                className="btn-primary flex-1 justify-center">
                {saving ? 'Saving…' : 'Save Result & Advance Winner'}
              </button>
              <button onClick={() => setResultMatch(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
