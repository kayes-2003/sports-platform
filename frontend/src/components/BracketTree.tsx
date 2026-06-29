'use client';
import { BracketRound, BracketMatch } from '@/types';
import { Trophy, Clock, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  bracket: BracketRound[];
  onMatchClick?: (match: BracketMatch) => void;
  canEdit?: boolean;
}

function MatchSlot({ match, onClick, canEdit }: {
  match: BracketMatch;
  onClick?: (m: BracketMatch) => void;
  canEdit?: boolean;
}) {
  const isCompleted = !!match.winner_id;
  const hasTeams = match.team_home_id || match.team_away_id;

  return (
    <div
      onClick={() => canEdit && hasTeams && onClick?.(match)}
      className={clsx(
        'w-52 rounded-xl border-2 overflow-hidden transition-all select-none',
        isCompleted
          ? 'border-green-200 shadow-sm'
          : hasTeams
          ? 'border-brand-200 shadow-sm'
          : 'border-dashed border-gray-200 opacity-60',
        canEdit && hasTeams && !isCompleted && 'cursor-pointer hover:border-brand-400 hover:shadow-md',
        canEdit && hasTeams && isCompleted && 'cursor-pointer hover:shadow-md'
      )}
    >
      {/* Home team */}
      <div className={clsx(
        'flex items-center gap-2 px-3 py-2 border-b border-gray-100',
        match.winner_id === match.team_home_id && 'bg-green-50',
        !match.team_home_id && 'bg-gray-50'
      )}>
        <div className={clsx(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          match.winner_id === match.team_home_id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
        )}>
          {match.winner_id === match.team_home_id ? '✓' : '1'}
        </div>
        <span className={clsx(
          'text-sm flex-1 truncate',
          match.team_home_id ? 'font-medium text-gray-900' : 'text-gray-400 italic'
        )}>
          {match.home_name || 'TBD'}
        </span>
        {match.score_home !== null && match.score_home !== undefined && hasTeams && (
          <span className={clsx(
            'text-sm font-bold tabular-nums w-6 text-center',
            match.winner_id === match.team_home_id ? 'text-green-600' : 'text-gray-500'
          )}>
            {match.score_home}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className={clsx(
        'flex items-center gap-2 px-3 py-2',
        match.winner_id === match.team_away_id && 'bg-green-50',
        !match.team_away_id && 'bg-gray-50'
      )}>
        <div className={clsx(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          match.winner_id === match.team_away_id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
        )}>
          {match.winner_id === match.team_away_id ? '✓' : '2'}
        </div>
        <span className={clsx(
          'text-sm flex-1 truncate',
          match.team_away_id ? 'font-medium text-gray-900' : 'text-gray-400 italic'
        )}>
          {match.away_name || 'TBD'}
        </span>
        {match.score_away !== null && match.score_away !== undefined && hasTeams && (
          <span className={clsx(
            'text-sm font-bold tabular-nums w-6 text-center',
            match.winner_id === match.team_away_id ? 'text-green-600' : 'text-gray-500'
          )}>
            {match.score_away}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BracketTree({ bracket, onMatchClick, canEdit }: Props) {
  if (!bracket || bracket.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">Bracket not generated yet</p>
        {canEdit && <p className="text-sm mt-1">Click "Generate Bracket" to create the elimination tree</p>}
      </div>
    );
  }

  // Sort rounds ascending (round 1 = first match round, last = Final)
  const sortedRounds = [...bracket].sort((a, b) => a.round_number - b.round_number);
  const isFinalRound = (r: BracketRound) => r.round_number === sortedRounds[sortedRounds.length - 1].round_number;

  // Vertical spacing between match slots based on round
  const getMatchGap = (roundIdx: number) => {
    // Gap doubles each round for proper bracket layout
    return Math.pow(2, roundIdx) * 16;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-0 items-start" style={{ minWidth: `${sortedRounds.length * 240}px` }}>
        {sortedRounds.map((round, rIdx) => {
          const matchGap = getMatchGap(rIdx);
          const topPad = rIdx === 0 ? 0 : (Math.pow(2, rIdx) - 1) * 56;

          return (
            <div key={round.id} className="flex flex-col items-center" style={{ minWidth: '240px' }}>
              {/* Round header */}
              <div className={clsx(
                'px-4 py-2 rounded-lg text-xs font-bold mb-4 text-center w-52',
                isFinalRound(round)
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : round.round_number === sortedRounds.length - 1
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              )}>
                {isFinalRound(round) ? '🏆 ' : ''}{round.round_name}
                <div className="text-xs font-normal opacity-70 mt-0.5">{round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}</div>
              </div>

              {/* Match slots with connector lines */}
              <div className="relative flex flex-col" style={{ gap: `${matchGap}px`, paddingTop: `${topPad}px` }}>
                {round.matches.map((match, mIdx) => (
                  <div key={match.id} className="relative flex items-center">
                    {/* Connector lines coming from previous round */}
                    {rIdx > 0 && (
                      <div className="absolute -left-12 top-1/2 w-12 flex items-center">
                        <div className="w-full h-px bg-gray-300" />
                      </div>
                    )}

                    <MatchSlot
                      match={match}
                      onClick={onMatchClick}
                      canEdit={canEdit}
                    />

                    {/* Connector lines going to next round */}
                    {rIdx < sortedRounds.length - 1 && (
                      <>
                        {/* Horizontal line out */}
                        <div className="absolute -right-12 top-1/2 w-12 flex items-center">
                          <div className="w-full h-px bg-gray-300" />
                        </div>
                        {/* Vertical connector to pair */}
                        {mIdx % 2 === 0 && round.matches[mIdx + 1] && (
                          <div
                            className="absolute bg-gray-300"
                            style={{
                              width: '1px',
                              right: '-1px',
                              top: '50%',
                              height: `${matchGap + 112}px`,
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Champion display */}
        {sortedRounds.length > 0 && (() => {
          const finalRound = sortedRounds[sortedRounds.length - 1];
          const finalMatch = finalRound?.matches[0];
          const champion = finalMatch?.winner_name;
          return champion ? (
            <div className="flex flex-col items-center justify-center pl-6 pt-12" style={{ minWidth: '180px' }}>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-6 py-5 text-center shadow-md">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-xs font-bold text-yellow-600 uppercase tracking-wide mb-1">Champion</div>
                <div className="font-bold text-gray-900 text-base">{champion}</div>
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
