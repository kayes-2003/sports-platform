'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Sport, LeaderboardEntry, TeamStat } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import Image from 'next/image';
import { User } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function InsightsContent() {
  const searchParams = useSearchParams();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState(searchParams.get('sport_id') || '');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [standings, setStandings] = useState<TeamStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.sports.list().then((d) => setSports(d.sports)); }, []);

  useEffect(() => {
    setLoading(true);
    const promises = [
      api.insights.leaderboard(selectedSport ? { sport_id: selectedSport } : {}),
    ];
    if (selectedSport) {
      promises.push(api.insights.sport(selectedSport) as any);
    }
    Promise.all(promises).then(([lb, si]: any) => {
      setLeaderboard(lb.leaderboard || []);
      if (si) {
        setStandings(si.team_standings || []);
        setMonthlyData(si.monthly_activity || []);
      } else {
        setStandings([]);
        setMonthlyData([]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedSport]);

  const pieData = standings.slice(0, 6).map((t) => ({
    name: t.name,
    value: t.wins,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insights & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Performance data, standings, and trends</p>
        </div>
        <select className="input w-48" value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card h-56 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="card">
            <h2 className="section-title">🏅 Top Scorers / Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No stats available. Add player stats to see rankings.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-white border border-gray-200 text-gray-500'
                    }`}>{i + 1}</div>
                    {p.photo_url ? (
                      <Image src={p.photo_url} alt={p.name} width={36} height={36}
                        className="rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-brand-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.team_name} · {p.sport_name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-brand-600">{p.total_points}</div>
                      <div className="text-xs text-gray-400">pts</div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm text-gray-600">{p.matches_played}</div>
                      <div className="text-xs text-gray-400">matches</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedSport && standings.length > 0 && (
            <>
              <div className="card">
                <h2 className="section-title">Team Standings — Wins</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={standings} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="wins" name="Wins" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="draws" name="Draws" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {pieData.some((d) => d.value > 0) && (
                <div className="card">
                  <h2 className="section-title">Win Distribution</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {monthlyData.length > 0 && (
                <div className="card">
                  <h2 className="section-title">Monthly Match Activity</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="card">
                <h2 className="section-title">Full Standings Table</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pl-2 text-gray-500 font-medium">Team</th>
                        <th className="text-center py-2 text-gray-500 font-medium">P</th>
                        <th className="text-center py-2 text-gray-500 font-medium">W</th>
                        <th className="text-center py-2 text-gray-500 font-medium">L</th>
                        <th className="text-center py-2 text-gray-500 font-medium">D</th>
                        <th className="text-center py-2 text-gray-500 font-medium">Win%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((t, i) => (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pl-2 flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                            {t.logo_url && (
                              <Image src={t.logo_url} alt={t.name} width={20} height={20} className="rounded-full object-cover" />
                            )}
                            <span className="font-medium text-gray-900">{t.name}</span>
                          </td>
                          <td className="py-2 text-center text-gray-600">{t.matches_played}</td>
                          <td className="py-2 text-center text-green-600 font-semibold">{t.wins}</td>
                          <td className="py-2 text-center text-red-500">{t.losses}</td>
                          <td className="py-2 text-center text-gray-500">{t.draws}</td>
                          <td className="py-2 text-center font-semibold text-brand-600">
                            {t.matches_played > 0
                              ? ((t.wins / t.matches_played) * 100).toFixed(0) + '%'
                              : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="card animate-pulse h-64 bg-gray-100" />}>
      <InsightsContent />
    </Suspense>
  );
}