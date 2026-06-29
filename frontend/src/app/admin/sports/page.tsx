'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Sport } from '@/types';
import Image from 'next/image';
import { Plus, Trash2, Trophy } from 'lucide-react';

export default function AdminSportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', scoring_unit: 'points' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.sports.list().then((d) => { setSports(d.sports); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('logo', logoFile);
      await api.sports.create(fd);
      setShowForm(false);
      setForm({ name: '', description: '', scoring_unit: 'points' });
      setLogoFile(null);
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sport? This will also delete all related teams and matches.')) return;
    await api.sports.delete(id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sports</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Add Sport
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Sport</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Football" />
              </div>
              <div>
                <label className="label">Scoring unit</label>
                <select className="input" value={form.scoring_unit}
                  onChange={(e) => setForm({ ...form, scoring_unit: e.target.value })}>
                  <option value="goals">Goals</option>
                  <option value="points">Points</option>
                  <option value="runs">Runs</option>
                  <option value="sets">Sets</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <input className="input" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
              </div>
              <div className="col-span-2">
                <label className="label">Logo (optional)</label>
                <input type="file" accept="image/*" className="input py-1.5"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Adding…' : 'Add Sport'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2,3].map((i) => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sports.map((sport) => (
            <div key={sport.id} className="card flex items-center gap-4">
              {sport.logo_url ? (
                <Image src={sport.logo_url} alt={sport.name} width={44} height={44} className="rounded-xl object-contain" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-brand-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{sport.name}</div>
                <div className="text-xs text-gray-500">{sport.team_count} teams · {sport.player_count} players · {sport.scoring_unit}</div>
              </div>
              <button onClick={() => handleDelete(sport.id)}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {sports.length === 0 && (
            <div className="col-span-2 card text-center py-10 text-gray-400">No sports added yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
