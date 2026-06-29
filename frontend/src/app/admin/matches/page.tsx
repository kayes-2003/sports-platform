'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Match, Sport, Team } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sport_id: '', team_home_id: '', team_away_id: '',
    venue: '', scheduled_at: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [filterSport, setFilterSport] = useState('');

  const load = async () => {
    setLoading(true);
    const [m, s, t] = await Promise.all([
      api.matches.list(filterSport ? { sport_id: filterSport } : {}),
      api.sports.list(),
      api.teams.list(),
    ]);
    setMatches(m.matches);
    setSports(s.sports);
    setTeams(t.teams);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterSport]);

  const filteredTeams = form.sport_id
    ? teams.filter((t) => t.sport_id === form.sport_id)
    : teams;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.matches.create(form);
      setShowForm(false);
      setForm({ sport_id: '', team_home_id: '', team_away_id: '', venue: '', scheduled_at: '', notes: '' });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    await api.matches.delete(id);
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.matches.update(id, { status });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Matches</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Schedule Match
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">Schedule New Match</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sport *</label>
                <select className="input" required value={form.sport_id}
                  onChange={(e) => setForm({ ...form, sport_id: e.target.value, team_home_id: '', team_away_id: '' })}>
                  <option value="">Select sport</option>
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Venue</label>
                <input className="input" value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="e.g. Main Ground" />
              </div>
              <div>
                <label className="label">Home Team *</label>
                <select className="input" required value={form.team_home_id}
                  onChange={(e) => setForm({ ...form, team_home_id: e.target.value })}>
                  <option value="">Select team</option>
                  {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Away Team *</label>
                <select className="input" required value={form.team_away_id}
                  onChange={(e) => setForm({ ...form, team_away_id: e.target.value })}>
                  <option value="">Select team</option>
                  {filteredTeams.filter((t) => t.id !== form.team_home_id).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Date & Time *</label>
                <input type="datetime-local" className="input" required value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <input className="input" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Scheduling…' : 'Schedule Match'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <select className="input w-44" value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="card h-14 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Match</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Sport</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Score</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.home_name} vs {m.away_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.sport_name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {format(new Date(m.scheduled_at), 'dd MMM yy, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    {m.status !== 'upcoming' ? `${m.score_home} – ${m.score_away}` : '–'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Link href={`/matches/${m.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-600">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No matches found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
