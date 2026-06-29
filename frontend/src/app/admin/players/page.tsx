'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Player, Sport, Team } from '@/types';
import Image from 'next/image';
import { Plus, Trash2, User, Edit2, X, Save } from 'lucide-react';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', team_id: '', sport_id: '', position: '',
    jersey_number: '', age: '', bio: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterSport, setFilterSport] = useState('');

  const load = async () => {
    setLoading(true);
    const [p, s, t] = await Promise.all([
      api.players.list(filterSport ? { sport_id: filterSport } : {}),
      api.sports.list(),
      api.teams.list(),
    ]);
    setPlayers(p.players);
    setSports(s.sports);
    setTeams(t.teams);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterSport]);

  const filteredTeams = form.sport_id ? teams.filter((t) => t.sport_id === form.sport_id) : teams;

  const resetForm = () => {
    setForm({ name: '', team_id: '', sport_id: '', position: '', jersey_number: '', age: '', bio: '' });
    setPhotoFile(null);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (photoFile) fd.append('photo', photoFile);
      if (editId) {
        await api.players.update(editId, fd);
      } else {
        await api.players.create(fd);
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const startEdit = (p: Player) => {
    setEditId(p.id);
    setForm({
      name: p.name, team_id: p.team_id, sport_id: p.sport_id,
      position: p.position || '', jersey_number: p.jersey_number?.toString() || '',
      age: p.age?.toString() || '', bio: p.bio || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this player?')) return;
    await api.players.delete(id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Players</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Add Player
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Edit Player' : 'Add New Player'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Full Name *</label>
                <input className="input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Sport *</label>
                <select className="input" required value={form.sport_id}
                  onChange={(e) => setForm({ ...form, sport_id: e.target.value, team_id: '' })}>
                  <option value="">Select sport</option>
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Team *</label>
                <select className="input" required value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                  <option value="">Select team</option>
                  {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Position / Role</label>
                <input className="input" value={form.position} placeholder="e.g. Forward, Goalkeeper"
                  onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div>
                <label className="label">Jersey #</label>
                <input type="number" className="input" value={form.jersey_number}
                  onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Age</label>
                <input type="number" className="input" value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div>
                <label className="label">Photo</label>
                <input type="file" accept="image/*" className="input py-1.5"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <div className="col-span-2">
                <label className="label">Bio</label>
                <textarea className="input" rows={2} value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : editId ? 'Update Player' : 'Add Player'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary btn-sm">
                <X className="w-3.5 h-3.5" />Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <select className="input w-44" value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
        <option value="">All sports</option>
        {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <div key={p.id} className="card flex items-center gap-3">
              {p.photo_url ? (
                <Image src={p.photo_url} alt={p.name} width={44} height={44}
                  className="w-11 h-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-brand-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                <div className="text-xs text-gray-500">{p.team_name}</div>
                {p.position && <div className="text-xs text-brand-600">{p.position}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(p)}
                  className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-3 card text-center py-10 text-gray-400">No players yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
