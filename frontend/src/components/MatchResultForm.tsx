'use client';

import { useEffect, useState } from 'react';
import { api, matchDetailsApi } from '@/lib/api';
import type { Player, ResultFormat } from '@/types';

interface Props {
  matchId: string;
  sportResultFormat: ResultFormat;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  onSaved?: () => void;
}

export default function MatchResultForm({
  matchId,
  sportResultFormat,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  onSaved,
}: Props) {
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');

  // Cricket-specific
  const [wonByWickets, setWonByWickets] = useState(false);
  const [wicketsRemaining, setWicketsRemaining] = useState('');

  // Volleyball-specific
  const [homeSets, setHomeSets] = useState('');
  const [awaySets, setAwaySets] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [motmId, setMotmId] = useState('');
  const [bestScorerId, setBestScorerId] = useState('');
  const [bestScorerValue, setBestScorerValue] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [homeRes, awayRes] = await Promise.all([
          api.players.list({ team_id: homeTeamId }),
          api.players.list({ team_id: awayTeamId }),
        ]);
        setPlayers([...(homeRes.players || []), ...(awayRes.players || [])]);
      } catch {
        // non-fatal — dropdowns just stay empty
      }
    })();
  }, [homeTeamId, awayTeamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (scoreHome === '' || scoreAway === '') return setError('Enter both scores.');

    const extra_result_data: Record<string, unknown> = {};
    if (sportResultFormat === 'runs_wickets' && wonByWickets) {
      if (!wicketsRemaining) return setError('Enter wickets remaining for the chasing team.');
      extra_result_data.winner_wickets_remaining = Number(wicketsRemaining);
    }
    if (sportResultFormat === 'sets') {
      if (homeSets) extra_result_data.home_sets = Number(homeSets);
      if (awaySets) extra_result_data.away_sets = Number(awaySets);
    }

    setSaving(true);
    try {
      await matchDetailsApi.updateResult(matchId, {
        score_home: Number(scoreHome),
        score_away: Number(scoreAway),
        man_of_the_match_id: motmId || undefined,
        best_scorer_id: bestScorerId || undefined,
        best_scorer_value: bestScorerValue ? Number(bestScorerValue) : undefined,
        extra_result_data,
      });
      setSuccess(true);
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  }

  const scoreLabel =
    sportResultFormat === 'runs_wickets' ? 'Runs' :
    sportResultFormat === 'goals' ? 'Goals' : 'Score';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[#3B1416] border border-[#7A2630] text-[#FF9D9D] text-sm">{error}</div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-[#102420] border border-[#1F4A40] text-[#5EEAD4] text-sm">Result saved.</div>
      )}

      {/* Scores */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">{scoreLabel}</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-[#5C6862] mb-1">{homeTeamName}</div>
            <input
              type="number"
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA]"
            />
          </div>
          <div>
            <div className="text-xs text-[#5C6862] mb-1">{awayTeamName}</div>
            <input
              type="number"
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA]"
            />
          </div>
        </div>
      </div>

      {/* Cricket: won by wickets toggle */}
      {sportResultFormat === 'runs_wickets' && (
        <div className="rounded-lg border border-[#26342F] p-4 bg-[#0F1714]">
          <label className="flex items-center gap-2 text-sm font-medium mb-3">
            <input
              type="checkbox"
              checked={wonByWickets}
              onChange={(e) => setWonByWickets(e.target.checked)}
            />
            Winner chased down the target (won by wickets, not runs)
          </label>
          {wonByWickets && (
            <div>
              <label className="block text-xs text-[#5C6862] mb-1">Wickets remaining for winner</label>
              <input
                type="number"
                min={0}
                max={10}
                value={wicketsRemaining}
                onChange={(e) => setWicketsRemaining(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
              />
            </div>
          )}
          <p className="text-xs text-[#5C6862] mt-2">
            Leave unchecked if winner defended — result will read &quot;won by N runs&quot;.
          </p>
        </div>
      )}

      {/* Volleyball: sets breakdown */}
      {sportResultFormat === 'sets' && (
        <div className="rounded-lg border border-[#26342F] p-4 bg-[#0F1714]">
          <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">Sets won</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder={`${homeTeamName} sets`}
              value={homeSets}
              onChange={(e) => setHomeSets(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
            />
            <input
              type="number"
              placeholder={`${awayTeamName} sets`}
              value={awaySets}
              onChange={(e) => setAwaySets(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
            />
          </div>
        </div>
      )}

      {/* MOTM + Best scorer */}
      <div className="rounded-lg border border-[#26342F] p-4 bg-[#0F1714] space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-[#5C6862]">Match details</h4>

        <div>
          <label className="block text-xs text-[#5C6862] mb-1">Man of the match</label>
          <select
            value={motmId}
            onChange={(e) => setMotmId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
          >
            <option value="">Not selected</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#5C6862] mb-1">
              Best scorer {sportResultFormat === 'runs_wickets' ? '(top run scorer)' : ''}
            </label>
            <select
              value={bestScorerId}
              onChange={(e) => setBestScorerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
            >
              <option value="">Not selected</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#5C6862] mb-1">Their tally</label>
            <input
              type="number"
              value={bestScorerValue}
              onChange={(e) => setBestScorerValue(e.target.value)}
              placeholder={sportResultFormat === 'runs_wickets' ? 'e.g. 87' : 'e.g. 3'}
              className="w-full px-3 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm placeholder-[#5C6862]"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-lg bg-[#5EEAD4] text-[#0B1210] font-bold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save result'}
      </button>
    </form>
  );
}