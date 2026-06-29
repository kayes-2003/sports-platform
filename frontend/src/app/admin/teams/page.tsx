'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Team, Sport } from '@/types';
import Image from 'next/image';
import { Plus, Trash2, Shield } from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sport_id: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterSport, setFilterSport] = useState('');

  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      api.teams.list(filterSport || undefined),
      api.sports.list(),
    ]);
    setTeams(t.teams);
    setSports(s.sports);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterSport]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('sport_id', form.sport_id);
      if (logoFile) fd.append('logo', logoFile);
      await api.teams.create(fd);
      setShowForm(false);
      setForm({ name: '', sport_id: '' });
      setLogoFile(null);
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await api.teams.delete(id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Teams</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Add Team
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Team</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Team Name *</label>
                <input className="input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Sport *</label>
                <select className="input" required value={form.sport_id}
                  onChange={(e) => setForm({ ...form, sport_id: e.target.value })}>
                  <option value="">Select sport</option>
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Team Logo (optional)</label>
                <input type="file" accept="image/*" className="input py-1.5"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Adding…' : 'Add Team'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <select className="input w-44" value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
        <option value="">All sports</option>
        {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Team</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Sport</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Players</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <Image src={team.logo_url} alt={team.name} width={32} height={32}
                          className="rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{team.sport_name}</td>
                  <td className="px-4 py-3 text-gray-500">{team.player_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(team.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">No teams yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
