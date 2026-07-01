'use client';

import { useEffect, useState } from 'react';
import { matchDetailsApi } from '@/lib/api';

type MatchDetailData = Awaited<ReturnType<typeof matchDetailsApi.getDetails>>;

export default function MatchDetailsPanel({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await matchDetailsApi.getDetails(matchId);
        if (!cancelled) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading) {
    return <div className="text-[#5C6862] text-sm py-6 text-center">Loading match details…</div>;
  }
  if (!data) return null;

  const { match, top_scorers } = data;
  const isComplete = match.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Sport-aware result headline */}
      {isComplete && match.result_summary && (
        <div className="text-center py-4">
          <div className="text-2xl font-black text-[#5EEAD4]">{match.result_summary}</div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="flex items-center justify-center gap-8 py-4">
        <TeamScore
          name={match.home_team_name || match.home_name}
          score={match.score_home}
          won={match.score_home > match.score_away}
        />
        <div className="text-[#5C6862] text-sm font-bold">VS</div>
        <TeamScore
          name={match.away_team_name || match.away_name}
          score={match.score_away}
          won={match.score_away > match.score_home}
        />
      </div>

      {isComplete && (
        <div className="grid sm:grid-cols-2 gap-4">
          {match.man_of_the_match_name && (
            <DetailCard label="Man of the Match" value={match.man_of_the_match_name} icon="★" />
          )}
          {match.best_scorer_name && (
            <DetailCard
              label="Best Scorer"
              value={`${match.best_scorer_name}${match.best_scorer_value ? ` — ${match.best_scorer_value}` : ''}`}
              icon="🎯"
            />
          )}
        </div>
      )}

      {top_scorers.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#5C6862] mb-3">Scorers</h4>
          <div className="space-y-2">
            {top_scorers.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
              >
                <span className="font-medium text-[#C8D2C9]">{s.player_name}</span>
                <span className="text-[#5EEAD4] font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamScore({ name, score, won }: { name?: string | null; score: number; won: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-medium mb-1 ${won ? 'text-[#5EEAD4]' : 'text-[#9CA89F]'}`}>{name}</div>
      <div className={`text-4xl font-black ${won ? 'text-[#F4F1EA]' : 'text-[#5C6862]'}`}>{score}</div>
    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-lg border border-[#26342F] bg-[#141E1B] p-4">
      <div className="text-xs text-[#5C6862] uppercase tracking-wide mb-1">{icon} {label}</div>
      <div className="font-semibold text-[#F4F1EA]">{value}</div>
    </div>
  );
}
