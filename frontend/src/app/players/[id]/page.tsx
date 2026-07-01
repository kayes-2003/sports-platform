'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Player, PlayerStat, ScoreEvent } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import Link from 'next/link';
import { User, Edit2, Save, X, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { canEdit } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Player>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    api.players.get(id).then((d) => {
      setPlayer(d.player);
      setStats(d.stats);
      setEvents(d.recent_events);
      setEditForm(d.player);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(editForm).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'id') form.append(k, String(v));
      });
      if (photoFile) form.append('photo', photoFile);
      const data = await api.players.update(id, form);
      setPlayer(data.player);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card animate-pulse h-80 bg-gray-100" />;
  if (!player) return <div className="card text-center py-16 text-gray-400">Player not found.</div>;

  const currentPhoto = photoPreview || player.photo_url;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            {currentPhoto ? (
              <Image src={currentPhoto} alt={player.name} width={96} height={96}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center">
                <User className="w-12 h-12 text-brand-200" />
              </div>
            )}
            {editing && (
              <label className="absolute -bottom-1 -right-1 bg-brand-600 text-white rounded-full p-1 cursor-pointer">
                <Edit2 className="w-3 h-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input className="input text-lg font-bold" value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Position / Role"
                    value={editForm.position || ''}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  <input className="input" placeholder="Jersey #" type="number"
                    value={editForm.jersey_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, jersey_number: parseInt(e.target.value) })} />
                  <input className="input" placeholder="Age" type="number"
                    value={editForm.age || ''}
                    onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) })} />
                </div>
                <textarea className="input" rows={2} placeholder="Bio"
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  {player.jersey_number && (
                    <span className="badge bg-gray-100 text-gray-600">#{player.jersey_number}</span>
                  )}
                  {player.position && (
                    <span className="badge bg-brand-50 text-brand-700">{player.position}</span>
                  )}
                  {player.age && (
                    <span className="badge bg-gray-100 text-gray-500">Age {player.age}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                  <Link href={`/teams/${player.team_id}`} className="hover:text-brand-600">
                    🛡️ {player.team_name}
                  </Link>
                  <span>⚽ {player.sport_name}</span>
                </div>
                {player.bio && <p className="text-sm text-gray-600 mt-2">{player.bio}</p>}
              </>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-2 shrink-0">
              {editing ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                    <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditForm(player); setPhotoPreview(''); }}
                    className="btn-secondary btn-sm">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                  <Edit2 className="w-3.5 h-3.5" />Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Season Stats */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brand-600" />Season Stats
        </h2>
        {stats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No stats recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Season</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Matches</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Goals/Pts</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Assists</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Wins</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Losses</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{s.season}</td>
                    <td className="py-2 text-center text-gray-600">{s.matches_played}</td>
                    <td className="py-2 text-center font-semibold text-brand-600">{s.goals_or_points}</td>
                    <td className="py-2 text-center text-gray-600">{s.assists}</td>
                    <td className="py-2 text-center text-green-600">{s.wins}</td>
                    <td className="py-2 text-center text-red-500">{s.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" />Recent Match Events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No events logged for this player.</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="text-lg">
                  {ev.event_type === 'goal' ? '⚽' : ev.event_type === 'wicket' ? '🏏' :
                   ev.event_type === 'point' ? '🏀' : '•'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 capitalize">{ev.event_type.replace('_', ' ')}</div>
                  {ev.description && <div className="text-xs text-gray-500">{ev.description}</div>}
                </div>
                <div className="text-xs text-gray-400 text-right">
                  <div>{ev.score_home_at_event} – {ev.score_away_at_event}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
