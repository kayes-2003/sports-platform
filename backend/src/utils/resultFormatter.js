/**
 * resultFormatter.js
 * Builds a human-readable result_summary string based on the sport's
 * result_format, so the frontend never has to special-case sport logic.
 *
 * extra_result_data shape per format:
 *   runs_wickets: { winner_wickets_remaining: 8 }  -> only relevant if winner batted second
 *   sets:         { home_sets: 3, away_sets: 1 }
 *   goals/points: {} (score_home/score_away alone are enough)
 */

function buildResultSummary({
  resultFormat,
  homeTeamName,
  awayTeamName,
  scoreHome,
  scoreAway,
  extraResultData = {},
}) {
  if (scoreHome === scoreAway) {
    return `Match drawn — ${scoreHome} : ${scoreAway}`;
  }

  const homeWon = scoreHome > scoreAway;
  const winnerName = homeWon ? homeTeamName : awayTeamName;
  const margin = Math.abs(scoreHome - scoreAway);

  switch (resultFormat) {
    case 'runs_wickets': {
      // If winner_wickets_remaining is provided, it means winner chased down a
      // target (won by wickets); otherwise winner defended a total (won by runs).
      const wicketsRemaining = extraResultData.winner_wickets_remaining;
      if (wicketsRemaining !== undefined && wicketsRemaining !== null) {
        return `${winnerName} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      }
      return `${winnerName} won by ${margin} run${margin === 1 ? '' : 's'}`;
    }

    case 'sets': {
      const homeSets = extraResultData.home_sets;
      const awaySets = extraResultData.away_sets;
      if (homeSets !== undefined && awaySets !== undefined) {
        return `${winnerName} won ${Math.max(homeSets, awaySets)}-${Math.min(homeSets, awaySets)} (sets)`;
      }
      return `${winnerName} won by ${margin} point${margin === 1 ? '' : 's'}`;
    }

    case 'goals':
      return `${winnerName} won ${homeWon ? scoreHome : scoreAway}-${homeWon ? scoreAway : scoreHome}`;

    case 'points':
    default:
      return `${winnerName} won by ${margin} point${margin === 1 ? '' : 's'}`;
  }
}

module.exports = { buildResultSummary };
