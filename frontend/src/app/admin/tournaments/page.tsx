'use client';
import { useEffect, useState } from 'react';
import { tournamentsApi, api } from '@/lib/api';
import { Tournament, Sport, Team } from '@/types';
import Link from 'next/link';
import { Plus, Trash2, ExternalLink, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const statusColor: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  ongoing:   'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-teams panel
  const [addTeamsFor, setAddTeamsFor] = useState<Tournament | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);

  const [form, setForm] = useState({
    name: '', sport_id: '', format: 'single_elimination',
    start_date: '', end_date: '', venue: '', description: '', prize: '', status: 'upcoming'
  });

  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([tournamentsApi.list(), api.sports.list()]);
    setTournaments(t.tournaments);
    setSports(s.sports);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.sport_id) {
      api.teams.list(form.sport_id).then(d => setFilteredTeams(d.teams));
    } else {
      setFilteredTeams([]);
    }
  }, [form.sport_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tournamentsApi.create(form);
      setShowForm(false);
      setForm({ name:'', sport_id:'', format:'single_elimination', start_date:'', end_date:'', venue:'', description:'', prize:'', status:'upcoming' });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tournament and its bracket?')) return;
    await tournamentsApi.delete(id);
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await tournamentsApi.update(id, { status });
    load();
  };

  const handleOpenAddTeams = async (t: Tournament) => {
    setAddTeamsFor(t);
    setSelectedTeams([]);
    const teams = await api.teams.list(t.sport_id);
    setAllTeams(teams.teams);
  };

  const handleAddTeams = async () => {
    if (!addTeamsFor || selectedTeams.length === 0) return;
    setSaving(true);
    try {
      await tournamentsApi.addTeams(addTeamsFor.id, selectedTeams);
      setAddTeamsFor(null);
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const toggleTeam = (id: string) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />Tournaments
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Create Tournament
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">Create New Tournament</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Tournament Name *</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. JU Inter-Department Football Championship 2025" />
              </div>
              <div>
                <label className="label">Sport *</label>
                <select className="input" required value={form.sport_id}
                  onChange={e => setForm({ ...form, sport_id: e.target.value })}>
                  <option value="">Select sport</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select className="input" value={form.format}
                  onChange={e => setForm({ ...form, format: e.target.value })}>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="group_knockout">Group + Knockout</option>
                </select>
              </div>
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" className="input" value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Venue</label>
                <input className="input" value={form.venue}
                  onChange={e => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. JU Central Sports Complex" />
              </div>
              <div>
                <label className="label">Prize / Trophy</label>
                <input className="input" value={form.prize}
                  onChange={e => setForm({ ...form, prize: e.target.value })}
                  placeholder="e.g. Champion Trophy + Medal" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of the tournament…" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Creating…' : 'Create Tournament'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add teams panel */}
      {addTeamsFor && (
        <div className="card border-green-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">
              Add Teams to: <span className="text-brand-600">{addTeamsFor.name}</span>
            </h2>
            <button onClick={() => setAddTeamsFor(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Select teams from <strong>{addTeamsFor.sport_name}</strong> to register in this tournament.
            Best practice: 4, 8, or 16 teams for single elimination.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto">
            {allTeams.map(t => (
              <label key={t.id} className={clsx(
                'flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all',
                selectedTeams.includes(t.id)
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-300'
              )}>
                <input type="checkbox" checked={selectedTeams.includes(t.id)}
                  onChange={() => toggleTeam(t.id)} className="rounded" />
                <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedTeams.length} teams selected</span>
            <button onClick={handleAddTeams} disabled={saving || selectedTeams.length === 0} className="btn-primary btn-sm ml-auto">
              <Users className="w-3.5 h-3.5" />{saving ? 'Adding…' : `Add ${selectedTeams.length} Teams`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tournament</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Sport</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Format</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Teams</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{t.sport_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell capitalize">
                    {t.format?.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <select value={t.status}
                      onChange={e => handleStatusChange(t.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{t.team_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => handleOpenAddTeams(t)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Add teams">
                        <Users className="w-4 h-4" />
                      </button>
                      <Link href={`/tournaments/${t.id}`}
                        className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No tournaments yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
