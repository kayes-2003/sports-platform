'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tournamentsApi } from '@/lib/api';
import type { Sport, Team, TournamentFormat } from '@/types';

export default function CreateTournamentPage() {
  const router = useRouter();

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('single_elimination');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [venue, setVenue] = useState('');
  const [prize, setPrize] = useState('');
  const [description, setDescription] = useState('');
  const [groupCount, setGroupCount] = useState(2);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIX for "Select sport is empty but required": the select used to render
  // (and the form could be submitted) before the sports fetch resolved,
  // because there was no explicit "has the list arrived yet" flag — an empty
  // array and a not-yet-loaded array looked identical to the UI. We now track
  // sportsLoaded separately and gate the interactive select behind it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.sports.list();
        if (!cancelled) {
          setSports(res.sports || []);
          setSportsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load sports list. Check your connection and refresh.');
          setSportsLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sportId) {
      setTeams([]);
      setSelectedTeamIds([]);
      return;
    }
    let cancelled = false;
    setTeamsLoading(true);
    (async () => {
      try {
        const res = await api.teams.list(sportId);
        if (!cancelled) {
          setTeams(res.teams || []);
          setSelectedTeamIds([]);
        }
      } catch {
        if (!cancelled) setError('Could not load teams for this sport.');
      } finally {
        if (!cancelled) setTeamsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sportId]);

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }

  const minTeamsRequired =
    format === 'double_elimination' ? 3 : format === 'group_knockout' ? groupCount * 2 : 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Tournament name is required.');
    if (!sportId) return setError('Select a sport.');
    if (selectedTeamIds.length < minTeamsRequired) {
      return setError(`Select at least ${minTeamsRequired} teams for this format.`);
    }

    setSubmitting(true);
    try {
      // Step 1: create the tournament shell
      const { tournament } = await tournamentsApi.create({
        name: name.trim(),
        sport_id: sportId,
        format,
        start_date: startDate || undefined,
        venue: venue || undefined,
        prize: prize || undefined,
        description: description || undefined,
        ...(format === 'group_knockout'
          ? { group_count: groupCount, teams_advance_per_group: advancePerGroup }
          : {}),
      });

      // Step 2: enter the selected teams
      await tournamentsApi.addTeams(tournament.id, selectedTeamIds);

      // Step 3: generate the bracket/rounds
      await tournamentsApi.generateBracket(tournament.id);

      router.push(`/admin/tournaments/${tournament.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create tournament.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1210] text-[#F4F1EA]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-[#5EEAD4] text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Admin / New Tournament
          </p>
          <h1 className="text-4xl font-black tracking-tight">Create Tournament</h1>
          <p className="text-[#9CA89F] mt-2">
            Set the format, pick teams, and the bracket builds itself.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-[#3B1416] border border-[#7A2630] text-[#FF9D9D] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">Tournament name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inter-Department Football Cup 2026"
              className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA] placeholder-[#5C6862] focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
            />
          </div>

          {/* Sport — gated on sportsLoaded so it's never empty-but-required */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">Sport</label>
            {!sportsLoaded ? (
              <div className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#5C6862] text-sm">
                Loading sports…
              </div>
            ) : sports.length === 0 ? (
              <div className="w-full px-4 py-3 rounded-lg bg-[#3B1416] border border-[#7A2630] text-[#FF9D9D] text-sm">
                No sports found. Add a sport first under Admin → Sports.
              </div>
            ) : (
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA] focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
              >
                <option value="">Select a sport…</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">Format</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: 'single_elimination', label: 'Knockout', sub: 'Lose once, you\u2019re out' },
                  { value: 'double_elimination', label: 'Double Elim', sub: 'Second chance via losers bracket' },
                  { value: 'round_robin', label: 'League', sub: 'Everyone plays everyone' },
                  { value: 'group_knockout', label: 'Groups + Knockout', sub: 'Group stage, then bracket' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={`text-left px-4 py-3 rounded-lg border transition ${
                    format === opt.value
                      ? 'border-[#5EEAD4] bg-[#102420]'
                      : 'border-[#26342F] bg-[#141E1B] hover:border-[#3A4A43]'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs text-[#9CA89F] mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Group config */}
          {format === 'group_knockout' && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#26342F] p-4 bg-[#0F1714]">
              <div>
                <label className="block text-xs text-[#5C6862] mb-1">Number of groups</label>
                <input
                  type="number"
                  min={2}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Math.max(2, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C6862] mb-1">Teams advancing per group</label>
                <input
                  type="number"
                  min={1}
                  value={advancePerGroup}
                  onChange={(e) => setAdvancePerGroup(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg bg-[#141E1B] border border-[#26342F] text-sm"
                />
              </div>
            </div>
          )}

          {/* Teams */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">
              Teams {selectedTeamIds.length > 0 && (
                <span className="text-[#5EEAD4]">({selectedTeamIds.length} selected, need {minTeamsRequired}+)</span>
              )}
            </label>
            {!sportId ? (
              <div className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#5C6862] text-sm">
                Select a sport first
              </div>
            ) : teamsLoading ? (
              <div className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#5C6862] text-sm">
                Loading teams…
              </div>
            ) : teams.length === 0 ? (
              <div className="w-full px-4 py-3 rounded-lg bg-[#3B1416] border border-[#7A2630] text-[#FF9D9D] text-sm">
                No teams found for this sport.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                {teams.map((t) => {
                  const selected = selectedTeamIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeam(t.id)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition ${
                        selected
                          ? 'border-[#5EEAD4] bg-[#102420] text-[#5EEAD4]'
                          : 'border-[#26342F] bg-[#141E1B] text-[#C8D2C9] hover:border-[#3A4A43]'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">
                Start date <span className="text-[#5C6862] font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">
                Venue <span className="text-[#5C6862] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Main Campus Ground"
                className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA] placeholder-[#5C6862]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">
              Prize <span className="text-[#5C6862] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="e.g. Trophy + ₹10,000"
              className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA] placeholder-[#5C6862]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-[#C8D2C9]">
              Description <span className="text-[#5C6862] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#141E1B] border border-[#26342F] text-[#F4F1EA] placeholder-[#5C6862] resize-none"
              placeholder="Any notes for participants…"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-lg bg-[#5EEAD4] text-[#0B1210] font-bold tracking-tight hover:bg-[#7FF2E0] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Creating tournament & generating bracket…' : 'Create tournament'}
          </button>
        </form>
      </div>
    </div>
  );
}
