'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User, Sport } from '@/types';
import { Plus, Trash2, UserCog, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'helper', assigned_sport_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const load = async () => {
    setLoading(true);
    const [u, s] = await Promise.all([
      api.users.list(filterRole || undefined),
      api.sports.list(),
    ]);
    setUsers(u.users);
    setSports(s.sports);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterRole]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.auth.register({
        ...form,
        assigned_sport_id: form.assigned_sport_id || undefined,
      });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'helper', assigned_sport_id: '' });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleRoleChange = async (id: string, role: string) => {
    await api.users.update(id, { role });
    load();
  };

  const handleSportAssign = async (id: string, sport_id: string) => {
    await api.users.update(id, { assigned_sport_id: sport_id || null });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await api.users.delete(id);
    load();
  };

  const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    helper: 'bg-blue-100 text-blue-700',
    visitor: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />Add User
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-4">Create Account</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="helper">Helper (scorekeeper)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'helper' && (
                <div className="col-span-2">
                  <label className="label">Assign to Sport (optional)</label>
                  <select className="input" value={form.assigned_sport_id}
                    onChange={(e) => setForm({ ...form, assigned_sport_id: e.target.value })}>
                    <option value="">All sports</option>
                    {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Restricted helpers can only update scores for their assigned sport.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Role filter */}
      <div className="flex gap-2">
        {['', 'admin', 'helper', 'visitor'].map((r) => (
          <button key={r} onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterRole === r ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Assigned Sport</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                      <option value="visitor">Visitor</option>
                      <option value="helper">Helper</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={u.assigned_sport_id || ''}
                      onChange={(e) => handleSportAssign(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                      <option value="">All</option>
                      {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                    {format(new Date(u.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
