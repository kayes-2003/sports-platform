'use client';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { api } from '@/lib/api';
import { Match, ScoreEvent, Player } from '@/types';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import Image from 'next/image';
import { MapPin, Clock, Wifi, WifiOff, Plus, Minus, CheckCircle } from 'lucide-react';

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { canEdit } = useAuth();
  const [initialMatch, setInitialMatch] = useState<Match | null>(null);
  const [initialEvents, setInitialEvents] = useState<ScoreEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Score update form state
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [eventType, setEventType] = useState('goal');
  const [eventTeam, setEventTeam] = useState('');
  const [eventPlayer, setEventPlayer] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [minute, setMinute] = useState('');
  const [markComplete, setMarkComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Live hook
  const { match, events: liveEvents, connected } = useLiveMatch(id, initialMatch);
  const allEvents = [...initialEvents, ...liveEvents].filter(
    (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
  );

  useEffect(() => {
    api.matches.get(id).then((d) => {
      setInitialMatch(d.match);
      setInitialEvents(d.events);
      setScoreHome(d.match.score_home);
      setScoreAway(d.match.score_away);
      // Load players for both teams
      return Promise.all([
        api.players.list({ team_id: d.match.team_home_id }),
        api.players.list({ team_id: d.match.team_away_id }),
      ]);
    }).then(([home, away]) => {
      setPlayers([...home.players, ...away.players]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleScoreUpdate = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.matches.updateScore(id, {
        score_home: scoreHome,
        score_away: scoreAway,
        event_type: eventType || undefined,
        team_id: eventTeam || undefined,
        player_id: eventPlayer || undefined,
        description: eventDesc || undefined,
        minute: minute ? parseInt(minute) : undefined,
        mark_completed: markComplete,
      });
      setSaveMsg('Score updated!');
      setEventDesc(''); setEventPlayer(''); setMinute('');
    } catch (e: any) {
      setSaveMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api.matches.update(id, { status });
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="card h-48 bg-gray-100" />
      <div className="card h-24 bg-gray-100" />
    </div>
  );

  if (!match) return (
    <div className="card text-center py-16 text-gray-400">Match not found.</div>
  );

  const isLiveOrUpcoming = match.status === 'live' || match.status === 'upcoming';
  const homePlayers = players.filter((p) => p.team_id === match.team_home_id);
  const awayPlayers = players.filter((p) => p.team_id === match.team_away_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Scoreboard */}
      <div className={`card text-center py-8 ${match.status === 'live' ? 'border-red-200 ring-1 ring-red-100' : ''}`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm text-gray-500 font-medium">{match.sport_name}</span>
          <span className="text-gray-300">·</span>
          {match.status === 'live' ? (
            <span className="badge-live">● Live</span>
          ) : match.status === 'upcoming' ? (
            <span className="badge-upcoming">Upcoming</span>
          ) : match.status === 'completed' ? (
            <span className="badge-completed">Full Time</span>
          ) : (
            <span className="badge bg-yellow-100 text-yellow-700">Cancelled</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            {connected ? <><Wifi className="w-3 h-3 text-green-500" />Live</> : <><WifiOff className="w-3 h-3" />Offline</>}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6">
          {/* Home */}
          <div className="flex-1 text-right">
            {match.home_logo && (
              <Image src={match.home_logo} alt={match.home_name || ''} width={56} height={56}
                className="rounded-full ml-auto mb-2 object-cover" />
            )}
            <div className="font-bold text-xl text-gray-900">{match.home_name}</div>
            <div className="text-xs text-gray-400 mt-1">Home</div>
          </div>

          {/* Score */}
          <div className="text-center">
            {match.status === 'upcoming' ? (
              <div>
                <div className="text-3xl font-bold text-gray-300">VS</div>
                <div className="text-sm text-gray-500 mt-1">
                  {format(new Date(match.scheduled_at), 'HH:mm')}
                </div>
              </div>
            ) : (
              <div className="text-5xl font-black text-gray-900 tracking-tight">
                {match.score_home}<span className="text-gray-200 mx-2">:</span>{match.score_away}
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 text-left">
            {match.away_logo && (
              <Image src={match.away_logo} alt={match.away_name || ''} width={56} height={56}
                className="rounded-full mr-auto mb-2 object-cover" />
            )}
            <div className="font-bold text-xl text-gray-900">{match.away_name}</div>
            <div className="text-xs text-gray-400 mt-1">Away</div>
          </div>
        </div>

        {/* Match info */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
          {match.venue && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.venue}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(match.scheduled_at), 'dd MMM yyyy, HH:mm')}
          </span>
        </div>
        {match.winner_name && (
          <div className="mt-3 text-green-600 font-semibold">🏆 Winner: {match.winner_name}</div>
        )}
      </div>

      {/* Live Score Update Panel — admin/helper only */}
      {canEdit && (
        <div className="card border-brand-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-brand-600" />
            Update Score
          </h3>

          {/* Status control */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['upcoming', 'live', 'completed', 'cancelled'].map((s) => (
              <button key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  match.status === s
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Score inputs */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="label">{match.home_name} (Home)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setScoreHome(Math.max(0, scoreHome - 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Minus className="w-4 h-4" />
                </button>
                <input type="number" min={0} className="input text-center text-xl font-bold"
                  value={scoreHome} onChange={(e) => setScoreHome(parseInt(e.target.value) || 0)} />
                <button onClick={() => setScoreHome(scoreHome + 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="label">{match.away_name} (Away)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setScoreAway(Math.max(0, scoreAway - 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Minus className="w-4 h-4" />
                </button>
                <input type="number" min={0} className="input text-center text-xl font-bold"
                  value={scoreAway} onChange={(e) => setScoreAway(parseInt(e.target.value) || 0)} />
                <button onClick={() => setScoreAway(scoreAway + 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Event logging */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Event type</label>
              <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="goal">Goal</option>
                <option value="wicket">Wicket</option>
                <option value="point">Point</option>
                <option value="six">Six</option>
                <option value="four">Four</option>
                <option value="penalty">Penalty</option>
                <option value="yellow_card">Yellow Card</option>
                <option value="red_card">Red Card</option>
                <option value="substitution">Substitution</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Team</label>
              <select className="input" value={eventTeam} onChange={(e) => setEventTeam(e.target.value)}>
                <option value="">Select team</option>
                <option value={match.team_home_id}>{match.home_name}</option>
                <option value={match.team_away_id}>{match.away_name}</option>
              </select>
            </div>
            <div>
              <label className="label">Player (optional)</label>
              <select className="input" value={eventPlayer} onChange={(e) => setEventPlayer(e.target.value)}>
                <option value="">None</option>
                {(eventTeam === match.team_home_id ? homePlayers : awayPlayers).map((p) => (
                  <option key={p.id} value={p.id}>#{p.jersey_number} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Minute</label>
              <input type="number" className="input" value={minute}
                onChange={(e) => setMinute(e.target.value)} placeholder="e.g. 45" />
            </div>
          </div>
          <div className="mb-3">
            <label className="label">Event description</label>
            <input type="text" className="input" value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)} placeholder="e.g. Header from corner kick" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={markComplete}
                onChange={(e) => setMarkComplete(e.target.checked)}
                className="rounded border-gray-300 text-brand-600" />
              Mark match as completed
            </label>
            <button onClick={handleScoreUpdate} disabled={saving} className="btn-primary ml-auto">
              {saving ? 'Saving…' : 'Push Score Update'}
            </button>
          </div>
          {saveMsg && (
            <div className={`mt-2 text-sm flex items-center gap-1 ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              <CheckCircle className="w-4 h-4" />{saveMsg}
            </div>
          )}
        </div>
      )}

      {/* Score events timeline */}
      <div className="card">
        <h3 className="section-title">Match Events</h3>
        {allEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No events logged yet.</p>
        ) : (
          <div className="space-y-3">
            {allEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="text-xs text-gray-400 w-8 text-right pt-0.5 shrink-0">
                  {ev.minute ? `${ev.minute}'` : '–'}
                </div>
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs shrink-0 font-bold">
                  {ev.event_type === 'goal' ? '⚽' :
                   ev.event_type === 'wicket' ? '🏏' :
                   ev.event_type === 'yellow_card' ? '🟨' :
                   ev.event_type === 'red_card' ? '🟥' : '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{ev.event_type.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{ev.team_name}</span>
                    {ev.player_name && (
                      <span className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">{ev.player_name}</span>
                    )}
                  </div>
                  {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Score at time: {ev.score_home_at_event} – {ev.score_away_at_event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
