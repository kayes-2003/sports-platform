'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { tournamentsApi } from '@/lib/api';
import type { Tournament, TournamentTeam, BracketRound, BracketMatch } from '@/types';

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [bracket, setBracket] = useState<BracketRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await tournamentsApi.get(id);
      setTournament(res.tournament);
      setTeams(res.teams);
      setBracket(res.bracket);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="min-h-screen bg-[#0B1210] text-[#9CA89F] flex items-center justify-center">Loading tournament…</div>;
  }
  if (error || !tournament) {
    return <div className="min-h-screen bg-[#0B1210] text-[#FF9D9D] flex items-center justify-center">{error || 'Tournament not found'}</div>;
  }

  const isGroupStage = tournament.format === 'group_knockout';
  const isRoundRobin = tournament.format === 'round_robin';
  const isBracketFormat = tournament.format === 'single_elimination' || tournament.format === 'double_elimination';

  const groupRound = bracket.find((r) => r.round_name === 'Group Stage');
  const knockoutRounds = bracket.filter((r) => r.round_name !== 'Group Stage' && r.round_name !== 'League Stage');
  const leagueRound = bracket.find((r) => r.round_name === 'League Stage');

  return (
    <div className="min-h-screen bg-[#0B1210] text-[#F4F1EA]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[#5EEAD4] text-xs font-bold tracking-[0.2em] uppercase mb-2">
              {tournament.sport_name} · {formatLabel(tournament.format)}
            </p>
            <h1 className="text-4xl font-black tracking-tight">{tournament.name}</h1>
            {(tournament.venue || tournament.prize) && (
              <p className="text-[#9CA89F] mt-2 text-sm">
                {tournament.venue && <span>{tournament.venue}</span>}
                {tournament.venue && tournament.prize && <span> · </span>}
                {tournament.prize && <span>{tournament.prize}</span>}
              </p>
            )}
          </div>
          <StatusBadge status={tournament.status} />
        </div>

        {isRoundRobin && leagueRound && (
          <LeagueView teams={teams} matches={leagueRound.matches} onSelectMatch={setActiveMatch} />
        )}

        {isGroupStage && (
          <div className="space-y-12">
            {groupRound && <GroupStageView teams={teams} matches={groupRound.matches} onSelectMatch={setActiveMatch} />}
            {knockoutRounds.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#5C6862] mb-4">Knockout Stage</h2>
                <BracketTree rounds={knockoutRounds} onSelectMatch={setActiveMatch} />
              </div>
            )}
          </div>
        )}

        {isBracketFormat && (
          <div className="space-y-12">
            <BracketTree
              rounds={bracket.filter((r) => r.bracket_side === 'winners' || r.bracket_side === 'main')}
              title={tournament.format === 'double_elimination' ? 'Winners Bracket' : undefined}
              onSelectMatch={setActiveMatch}
            />
            {tournament.format === 'double_elimination' && (
              <>
                <BracketTree
                  rounds={bracket.filter((r) => r.bracket_side === 'losers')}
                  title="Losers Bracket"
                  onSelectMatch={setActiveMatch}
                />
                <BracketTree
                  rounds={bracket.filter((r) => r.bracket_side === 'grand_final')}
                  title="Grand Final"
                  onSelectMatch={setActiveMatch}
                />
              </>
            )}
          </div>
        )}

        {activeMatch && (
          <ResultModal
            match={activeMatch}
            tournamentId={id}
            onClose={() => setActiveMatch(null)}
            onSaved={() => { setActiveMatch(null); load(); }}
          />
        )}
      </div>
    </div>
  );
}

function formatLabel(format: Tournament['format']) {
  switch (format) {
    case 'single_elimination': return 'Knockout';
    case 'double_elimination': return 'Double Elimination';
    case 'round_robin': return 'League';
    case 'group_knockout': return 'Groups + Knockout';
    default: return format;
  }
}

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const styles: Record<string, string> = {
    completed: 'bg-[#102420] text-[#5EEAD4]',
    ongoing: 'bg-[#241B0B] text-[#F0B254]',
    upcoming: 'bg-[#1A1A1A] text-[#9CA89F]',
    cancelled: 'bg-[#3B1416] text-[#FF9D9D]',
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || styles.upcoming}`}>
      {status}
    </span>
  );
}

// ── Bracket tree (single/double elimination, and knockout stage of group_knockout) ──
function BracketTree({
  rounds,
  title,
  onSelectMatch,
}: {
  rounds: BracketRound[];
  title?: string;
  onSelectMatch: (m: BracketMatch) => void;
}) {
  if (rounds.length === 0) return null;
  const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number);

  return (
    <div>
      {title && <h2 className="text-sm font-bold uppercase tracking-wide text-[#5C6862] mb-4">{title}</h2>}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-12 min-w-max">
          {sorted.map((round) => (
            <div key={round.id} className="flex flex-col justify-around gap-6" style={{ minWidth: 220 }}>
              <div className="text-xs font-bold uppercase tracking-wider text-[#5C6862] mb-1">
                {round.round_name}
              </div>
              {round.matches
                .sort((a, b) => a.slot_number - b.slot_number)
                .map((m) => (
                  <BracketCard key={m.id} match={m} onClick={() => onSelectMatch(m)} />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketCard({ match, onClick }: { match: BracketMatch; onClick: () => void }) {
  const clickable = match.match_status === 'ready' || match.match_status === 'completed';
  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`text-left rounded-lg border overflow-hidden transition ${
        clickable ? 'border-[#26342F] hover:border-[#5EEAD4] cursor-pointer' : 'border-[#1A211E] opacity-60'
      } bg-[#141E1B]`}
    >
      <TeamRow name={match.home_name} isWinner={match.winner_id === match.team_home_id} hasResult={!!match.winner_id} />
      <div className="h-px bg-[#26342F]" />
      <TeamRow name={match.away_name} isWinner={match.winner_id === match.team_away_id} hasResult={!!match.winner_id} />
      {match.match_status === 'bye' && (
        <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-[#5C6862] bg-[#0F1714]">Bye</div>
      )}
    </button>
  );
}

function TeamRow({ name, isWinner, hasResult }: { name?: string | null; isWinner: boolean; hasResult: boolean }) {
  return (
    <div className={`px-3 py-2.5 text-sm font-medium flex items-center justify-between ${
      hasResult && isWinner ? 'text-[#5EEAD4]' : hasResult ? 'text-[#5C6862]' : 'text-[#C8D2C9]'
    }`}>
      <span>{name || 'TBD'}</span>
      {hasResult && isWinner && <span className="text-xs">●</span>}
    </div>
  );
}

// ── League table (round robin) ──
function LeagueView({ teams, matches, onSelectMatch }: { teams: TournamentTeam[]; matches: BracketMatch[]; onSelectMatch: (m: BracketMatch) => void }) {
  return (
    <div className="space-y-10">
      <StandingsTable teams={teams} />
      <FixtureList matches={matches} onSelectMatch={onSelectMatch} />
    </div>
  );
}

// ── Group stage (group_knockout) ──
function GroupStageView({ teams, matches, onSelectMatch }: { teams: TournamentTeam[]; matches: BracketMatch[]; onSelectMatch: (m: BracketMatch) => void }) {
  const groupNames = Array.from(new Set(teams.map((t) => t.group_name).filter(Boolean))) as string[];
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#5C6862] mb-4">Group Stage</h2>
      <div className="grid md:grid-cols-2 gap-8">
        {groupNames.sort().map((g) => (
          <div key={g}>
            <div className="text-xs font-bold text-[#5EEAD4] mb-2">Group {g}</div>
            <StandingsTable teams={teams.filter((t) => t.group_name === g)} />
            <div className="mt-3">
              <FixtureList matches={matches.filter((m) => m.group_name === g)} onSelectMatch={onSelectMatch} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StandingsTable({ teams }: { teams: TournamentTeam[] }) {
  return (
    <div className="rounded-lg border border-[#26342F] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#141E1B] text-[#9CA89F] text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Team</th>
            <th className="px-3 py-3">P</th>
            <th className="px-3 py-3">W</th>
            <th className="px-3 py-3">D</th>
            <th className="px-3 py-3">L</th>
            <th className="px-3 py-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t: any) => (
            <tr key={t.id} className="border-t border-[#1A211E]">
              <td className="px-4 py-3 font-medium">{t.team_name}</td>
              <td className="px-3 py-3 text-center text-[#9CA89F]">{t.played}</td>
              <td className="px-3 py-3 text-center text-[#9CA89F]">{t.wins}</td>
              <td className="px-3 py-3 text-center text-[#9CA89F]">{t.draws}</td>
              <td className="px-3 py-3 text-center text-[#9CA89F]">{t.losses}</td>
              <td className="px-3 py-3 text-center font-bold text-[#5EEAD4]">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixtureList({ matches, onSelectMatch, compact }: { matches: BracketMatch[]; onSelectMatch: (m: BracketMatch) => void; compact?: boolean }) {
  return (
    <div className={`grid ${compact ? '' : 'sm:grid-cols-2'} gap-3`}>
      {matches.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelectMatch(m)}
          className="rounded-lg border border-[#26342F] bg-[#141E1B] p-3 text-left hover:border-[#5EEAD4] transition"
        >
          <div className="flex items-center justify-between text-sm">
            <span className={m.winner_id === m.team_home_id ? 'text-[#5EEAD4] font-semibold' : ''}>{m.home_name}</span>
            <span className="text-[#5C6862] text-xs">vs</span>
            <span className={m.winner_id === m.team_away_id ? 'text-[#5EEAD4] font-semibold' : ''}>{m.away_name}</span>
          </div>
          {m.match_status === 'completed' && (
            <div className="text-[10px] uppercase text-[#5C6862] mt-1">Result recorded</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Result entry modal ──
function ResultModal({
  match,
  tournamentId,
  onClose,
  onSaved,
}: {
  match: BracketMatch;
  tournamentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [winnerId, setWinnerId] = useState(match.winner_id || '');
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!winnerId) return setError('Pick the winning team.');
    setSaving(true);
    setError(null);
    try {
      await tournamentsApi.setResult(tournamentId, match.id, {
        winner_id: winnerId,
        score_home: scoreHome ? Number(scoreHome) : undefined,
        score_away: scoreAway ? Number(scoreAway) : undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save result.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#141E1B] border border-[#26342F] rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Record result</h3>
        {error && <div className="mb-4 text-sm text-[#FF9D9D]">{error}</div>}

        <div className="space-y-2 mb-4">
          {[match.team_home_id, match.team_away_id].map((tid, i) => {
            if (!tid) return null;
            const name = i === 0 ? match.home_name : match.away_name;
            return (
              <button
                key={tid}
                onClick={() => setWinnerId(tid)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border transition ${
                  winnerId === tid ? 'border-[#5EEAD4] bg-[#102420] text-[#5EEAD4]' : 'border-[#26342F] text-[#C8D2C9]'
                }`}
              >
                {name} {winnerId === tid && '— Winner'}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <input type="number" placeholder="Home score" value={scoreHome} onChange={(e) => setScoreHome(e.target.value)} className="px-3 py-2 rounded-lg bg-[#0B1210] border border-[#26342F] text-sm" />
          <input type="number" placeholder="Away score" value={scoreAway} onChange={(e) => setScoreAway(e.target.value)} className="px-3 py-2 rounded-lg bg-[#0B1210] border border-[#26342F] text-sm" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#26342F] text-[#9CA89F] font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#5EEAD4] text-[#0B1210] font-bold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save result'}
          </button>
        </div>
      </div>
    </div>
  );
}