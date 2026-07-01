/**
 * bracketBuilder.js
 * Generates bracket structures for all 4 tournament formats.
 * Each builder returns { rounds: [...], matches: [...] } using TEMP ids
 * (the controller does a two-pass DB insert to resolve real UUIDs for
 * next_match_id / loser_next_match_id, since those reference sibling rows
 * that don't exist yet at insert time).
 */

const { randomUUID } = require('crypto');

function nextPowerOf2(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function roundName(roundsFromEnd) {
  // roundsFromEnd: 0 = final, 1 = semifinal, 2 = quarterfinal, else "Round of N"
  if (roundsFromEnd === 0) return 'Final';
  if (roundsFromEnd === 1) return 'Semifinal';
  if (roundsFromEnd === 2) return 'Quarterfinal';
  return `Round of ${Math.pow(2, roundsFromEnd + 1)}`;
}

// ── SINGLE ELIMINATION ────────────────────────────────────────────────────
function buildSingleElimination(teamIds) {
  const bracketSize = nextPowerOf2(teamIds.length);
  const byeCount = bracketSize - teamIds.length;
  const totalRounds = Math.log2(bracketSize);

  const slots = [...teamIds];
  for (let i = 0; i < byeCount; i++) slots.push(null);

  const round1Pairs = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    round1Pairs.push([slots[i], slots[bracketSize - 1 - i]]);
  }

  const rounds = [];
  for (let r = 0; r < totalRounds; r++) {
    rounds.push({
      tempId: randomUUID(),
      round_number: r + 1,
      round_name: roundName(totalRounds - 1 - r),
      bracket_side: 'main',
      nodes: [],
    });
  }

  const nodesInRound = (r) => bracketSize / Math.pow(2, r + 1);
  for (let r = 0; r < totalRounds; r++) {
    const count = nodesInRound(r);
    for (let pos = 0; pos < count; pos++) {
      rounds[r].nodes.push({
        tempId: randomUUID(),
        slot_number: pos,
        team_home_id: null,
        team_away_id: null,
        winner_id: null,
        match_status: 'pending',
        next_match_id: null,
        next_match_slot: null,
      });
    }
  }

  round1Pairs.forEach(([home, away], idx) => {
    const node = rounds[0].nodes[idx];
    node.team_home_id = home;
    node.team_away_id = away;
    if (home && !away) { node.match_status = 'bye'; node.winner_id = home; }
    else if (away && !home) { node.match_status = 'bye'; node.winner_id = away; }
    else { node.match_status = 'ready'; }
  });

  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].nodes.forEach((node, idx) => {
      const nextNode = rounds[r + 1].nodes[Math.floor(idx / 2)];
      node.next_match_id = nextNode.tempId;
      node.next_match_slot = idx % 2; // 0 = home, 1 = away
    });
  }

  // propagate byes forward
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].nodes.forEach((node) => {
      if (node.match_status === 'bye' && node.winner_id) {
        const nextNode = rounds[r + 1].nodes.find((n) => n.tempId === node.next_match_id);
        if (nextNode) {
          if (node.next_match_slot === 0) nextNode.team_home_id = node.winner_id;
          else nextNode.team_away_id = node.winner_id;
        }
      }
    });
  }
  for (let r = 1; r < rounds.length; r++) {
    rounds[r].nodes.forEach((node) => {
      if (node.team_home_id && node.team_away_id) node.match_status = 'ready';
    });
  }

  return { rounds };
}

// ── DOUBLE ELIMINATION ────────────────────────────────────────────────────
// Winners bracket behaves like single elimination. Losers from winners-round R
// drop into losers bracket. Standard "losers bracket" interleaving: a losers
// round absorbs new losers AND plays survivors from the previous losers round.
// Finishes with a Grand Final between winners-bracket champion and
// losers-bracket champion (single grand final — no bracket reset variant).
function buildDoubleElimination(teamIds) {
  const bracketSize = nextPowerOf2(teamIds.length);
  const wbRoundsCount = Math.log2(bracketSize);

  const { rounds: winnersRounds } = buildSingleElimination(teamIds);
  winnersRounds.forEach((r) => { r.bracket_side = 'winners'; r.round_name = `Winners ${roundName(wbRoundsCount - r.round_number)}`; });

  // Build losers bracket skeleton.
  // Number of losers rounds = 2 * (wbRoundsCount - 1), standard formula for this layout.
  const lbRoundsCount = Math.max(1, 2 * (wbRoundsCount - 1));
  const losersRounds = [];
  for (let r = 0; r < lbRoundsCount; r++) {
    losersRounds.push({
      tempId: randomUUID(),
      round_number: r + 1,
      round_name: `Losers Round ${r + 1}`,
      bracket_side: 'losers',
      nodes: [],
    });
  }

  // Seed losers-round node counts: classic pattern halves every 2 rounds.
  // Round sizes mirror: LR1 = WB_R1_matches/2, LR2 = LR1, LR3 = LR2/2 ... simplified
  // robust approach: start with wbR1 matches/2 nodes, then alternate
  // (drop-in round = same size as previous, consolidation round = half size).
  let currentSize = Math.max(1, Math.floor(winnersRounds[0].nodes.length / 2));
  for (let r = 0; r < lbRoundsCount; r++) {
    const size = Math.max(1, currentSize);
    for (let pos = 0; pos < size; pos++) {
      losersRounds[r].nodes.push({
        tempId: randomUUID(),
        slot_number: pos,
        team_home_id: null,
        team_away_id: null,
        winner_id: null,
        match_status: 'pending',
        next_match_id: null,
        next_match_slot: null,
      });
    }
    // odd rounds (0-indexed even) are "consolidation" — halve next; else hold
    if (r % 2 === 1) currentSize = Math.max(1, Math.floor(currentSize / 2));
  }

  // Wire winners bracket losers into losers bracket entry points (round-robin
  // assignment into LR1, LR3, LR5... drop-in rounds) — simplified deterministic mapping.
  // Losers of WB round 1 -> LR1 (paired against each other).
  winnersRounds[0].nodes.forEach((node, idx) => {
    const lrNode = losersRounds[0].nodes[Math.floor(idx / 2)];
    node.loser_next_match_id = lrNode.tempId;
    node.loser_next_match_slot = idx % 2;
  });
  // Losers of subsequent WB rounds feed into later "drop-in" losers rounds
  // (every other LB round starting at index 1).
  for (let wbR = 1; wbR < winnersRounds.length; wbR++) {
    const targetLrIndex = Math.min(losersRounds.length - 1, wbR * 2 - 1);
    winnersRounds[wbR].nodes.forEach((node, idx) => {
      const lrNode = losersRounds[targetLrIndex].nodes[idx] || losersRounds[targetLrIndex].nodes[0];
      node.loser_next_match_id = lrNode?.tempId || null;
      node.loser_next_match_slot = 1; // dropped-in player typically fills "away" vs LB survivor
    });
  }

  // Wire losers bracket internal advancement (winner of LRn -> LRn+1)
  for (let r = 0; r < losersRounds.length - 1; r++) {
    losersRounds[r].nodes.forEach((node, idx) => {
      const nextNode = losersRounds[r + 1].nodes[Math.floor(idx / 2)] || losersRounds[r + 1].nodes[0];
      node.next_match_id = nextNode?.tempId || null;
      node.next_match_slot = node.next_match_slot ?? 0;
    });
  }

  // Grand final round: winners bracket champion vs losers bracket champion
  const grandFinal = {
    tempId: randomUUID(),
    round_number: 1,
    round_name: 'Grand Final',
    bracket_side: 'grand_final',
    nodes: [
      {
        tempId: randomUUID(),
        slot_number: 0,
        team_home_id: null,
        team_away_id: null,
        winner_id: null,
        match_status: 'pending',
        next_match_id: null,
        next_match_slot: null,
      },
    ],
  };
  const wbFinalNode = winnersRounds[winnersRounds.length - 1].nodes[0];
  wbFinalNode.next_match_id = grandFinal.nodes[0].tempId;
  wbFinalNode.next_match_slot = 0;
  const lbFinalNode = losersRounds[losersRounds.length - 1].nodes[0];
  if (lbFinalNode) {
    lbFinalNode.next_match_id = grandFinal.nodes[0].tempId;
    lbFinalNode.next_match_slot = 1;
  }

  return { rounds: [...winnersRounds, ...losersRounds, grandFinal] };
}

// ── ROUND ROBIN ────────────────────────────────────────────────────────────
function buildRoundRobin(teamIds) {
  const fixtures = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push([teamIds[i], teamIds[j]]);
    }
  }
  const round = {
    tempId: randomUUID(),
    round_number: 1,
    round_name: 'League Stage',
    bracket_side: 'main',
    nodes: fixtures.map(([home, away], idx) => ({
      tempId: randomUUID(),
      slot_number: idx,
      team_home_id: home,
      team_away_id: away,
      winner_id: null,
      match_status: 'ready',
      next_match_id: null,
      next_match_slot: null,
    })),
  };
  return { rounds: [round] };
}

// ── GROUP + KNOCKOUT ────────────────────────────────────────────────────────
// Splits teams into N groups (round robin within group), then builds a
// single-elimination knockout bracket with placeholder slots for the
// top-K finishers of each group (filled in later once group stage completes).
function buildGroupKnockout(teamIds, groupCount = 2, advancePerGroup = 2) {
  groupCount = Math.max(2, groupCount);
  const groups = Array.from({ length: groupCount }, () => []);
  teamIds.forEach((id, idx) => groups[idx % groupCount].push(id));

  const groupLetter = (i) => String.fromCharCode(65 + i); // A, B, C...

  const groupRound = {
    tempId: randomUUID(),
    round_number: 1,
    round_name: 'Group Stage',
    bracket_side: 'group',
    nodes: [],
  };

  groups.forEach((group, gIdx) => {
    let slot = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        groupRound.nodes.push({
          tempId: randomUUID(),
          slot_number: slot++,
          group_name: groupLetter(gIdx),
          team_home_id: group[i],
          team_away_id: group[j],
          winner_id: null,
          match_status: 'ready',
          next_match_id: null,
          next_match_slot: null,
        });
      }
    }
  });

  // Knockout stage: placeholder bracket sized to (groupCount * advancePerGroup) teams.
  // Slots are null until group stage completes and standings are computed;
  // controller fills these in via a separate "advance group winners" step.
  const knockoutTeamCount = groupCount * advancePerGroup;
  const { rounds: knockoutRounds } = buildSingleElimination(
    Array.from({ length: knockoutTeamCount }, () => null) // all-null placeholder bracket
  );
  knockoutRounds.forEach((r) => { r.bracket_side = 'main'; });

  return { rounds: [groupRound, ...knockoutRounds], groups: groups.map((g, i) => ({ name: groupLetter(i), team_ids: g })) };
}

module.exports = {
  buildSingleElimination,
  buildDoubleElimination,
  buildRoundRobin,
  buildGroupKnockout,
  nextPowerOf2,
};