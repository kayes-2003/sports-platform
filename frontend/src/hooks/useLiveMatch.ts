'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Match, ScoreEvent } from '@/types';

interface LiveUpdate {
  match_id: string;
  score_home: number;
  score_away: number;
  status: string;
  event?: ScoreEvent;
}

export function useLiveMatch(matchId: string, initialMatch: Match | null) {
  const [match, setMatch] = useState<Match | null>(initialMatch);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const socket = getSocket();

    socket.emit('join_match', matchId);
    setConnected(socket.connected);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('score_update', (update: LiveUpdate) => {
      if (update.match_id !== matchId) return;
      setMatch((prev) =>
        prev
          ? { ...prev, score_home: update.score_home, score_away: update.score_away, status: update.status as Match['status'] }
          : prev
      );
      if (update.event) {
        setEvents((prev) => [...prev, update.event!]);
      }
    });

    socket.on('match_status', (data: { match_id: string; status: string }) => {
      if (data.match_id !== matchId) return;
      setMatch((prev) => prev ? { ...prev, status: data.status as Match['status'] } : prev);
    });

    return () => {
      socket.emit('leave_match', matchId);
      socket.off('score_update');
      socket.off('match_status');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [matchId]);

  useEffect(() => {
    if (initialMatch) setMatch(initialMatch);
  }, [initialMatch]);

  return { match, events, connected };
}
