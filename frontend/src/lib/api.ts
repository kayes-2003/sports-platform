const BASE = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://sports-platform-qbxi.vercel.app/api')
  : (process.env.NEXT_PUBLIC_API_URL || '/api');

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sports_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: import('@/types').User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (data: Record<string, unknown>) =>
      request<{ token: string; user: import('@/types').User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: import('@/types').User }>('/auth/me'),
  },

  sports: {
    list: () => request<{ sports: import('@/types').Sport[] }>('/sports'),
    get: (id: string) => request<{ sport: import('@/types').Sport; teams: import('@/types').Team[] }>(`/sports/${id}`),
    create: (form: FormData) => request<{ sport: import('@/types').Sport }>('/sports', { method: 'POST', body: form }),
    update: (id: string, form: FormData) => request<{ sport: import('@/types').Sport }>(`/sports/${id}`, { method: 'PUT', body: form }),
    delete: (id: string) => request<{ message: string }>(`/sports/${id}`, { method: 'DELETE' }),
  },

  teams: {
    list: (sportId?: string) =>
      request<{ teams: import('@/types').Team[] }>(`/teams${sportId ? `?sport_id=${sportId}` : ''}`),
    get: (id: string) => request<{ team: import('@/types').Team; players: import('@/types').Player[]; recent_matches: import('@/types').Match[] }>(`/teams/${id}`),
    h2h: (t1: string, t2: string) => request<{ matches: import('@/types').Match[]; stats: Record<string, number> }>(`/teams/h2h/${t1}/${t2}`),
    create: (form: FormData) => request<{ team: import('@/types').Team }>('/teams', { method: 'POST', body: form }),
    update: (id: string, form: FormData) => request<{ team: import('@/types').Team }>(`/teams/${id}`, { method: 'PUT', body: form }),
    delete: (id: string) => request<{ message: string }>(`/teams/${id}`, { method: 'DELETE' }),
  },

  players: {
    list: (params?: { team_id?: string; sport_id?: string; search?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ players: import('@/types').Player[] }>(`/players${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<{ player: import('@/types').Player; stats: import('@/types').PlayerStat[]; recent_events: import('@/types').ScoreEvent[] }>(`/players/${id}`),
    create: (form: FormData) => request<{ player: import('@/types').Player }>('/players', { method: 'POST', body: form }),
    update: (id: string, form: FormData) => request<{ player: import('@/types').Player }>(`/players/${id}`, { method: 'PUT', body: form }),
    updateStats: (id: string, data: Record<string, unknown>) =>
      request<{ stats: import('@/types').PlayerStat }>(`/players/${id}/stats`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/players/${id}`, { method: 'DELETE' }),
  },

  matches: {
    list: (params?: { status?: string; sport_id?: string; date?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ matches: import('@/types').Match[] }>(`/matches${q ? `?${q}` : ''}`);
    },
    today: () => request<{ matches: import('@/types').Match[] }>('/matches/today'),
    get: (id: string) => request<{ match: import('@/types').Match; events: import('@/types').ScoreEvent[] }>(`/matches/${id}`),
    create: (data: Record<string, unknown>) => request<{ match: import('@/types').Match }>('/matches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ match: import('@/types').Match }>(`/matches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateScore: (id: string, data: Record<string, unknown>) => request<{ match: import('@/types').Match }>(`/matches/${id}/score`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/matches/${id}`, { method: 'DELETE' }),
  },

  insights: {
    overview: () => request<import('@/types').InsightOverview>('/insights/overview'),
    sport: (id: string) => request<{ team_standings: import('@/types').TeamStat[]; top_scorers: import('@/types').LeaderboardEntry[]; monthly_activity: unknown[] }>(`/insights/sport/${id}`),
    leaderboard: (params?: { sport_id?: string; season?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ leaderboard: import('@/types').LeaderboardEntry[] }>(`/insights/leaderboard${q ? `?${q}` : ''}`);
    },
  },

  users: {
    list: (role?: string) =>
      request<{ users: import('@/types').User[] }>(`/users${role ? `?role=${role}` : ''}`),
    update: (id: string, data: Record<string, unknown>) => request<{ user: import('@/types').User }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  },
};

export const tournamentsApi = {
  list: (params?: { sport_id?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ tournaments: import('@/types').Tournament[] }>(`/tournaments${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<{
    tournament: import('@/types').Tournament;
    teams: import('@/types').TournamentTeam[];
    bracket: import('@/types').BracketRound[];
  }>(`/tournaments/${id}`),
  create: (data: Record<string, unknown>) =>
    request<{ tournament: import('@/types').Tournament }>('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<{ tournament: import('@/types').Tournament }>(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<{ message: string }>(`/tournaments/${id}`, { method: 'DELETE' }),
  addTeams: (id: string, team_ids: string[]) =>
    request<{ message: string }>(`/tournaments/${id}/teams`, { method: 'POST', body: JSON.stringify({ team_ids }) }),
  removeTeam: (id: string, teamId: string) =>
    request<{ message: string }>(`/tournaments/${id}/teams/${teamId}`, { method: 'DELETE' }),
  generateBracket: (id: string) =>
    request<{ tournament: import('@/types').Tournament; teams: import('@/types').TournamentTeam[]; bracket: import('@/types').BracketRound[] }>(`/tournaments/${id}/generate-bracket`, { method: 'POST' }),
  setResult: (id: string, matchId: string, data: Record<string, unknown>) =>
    request<{ message: string }>(`/tournaments/${id}/bracket/${matchId}/result`, { method: 'POST', body: JSON.stringify(data) }),
};

export const matchDetailsApi = {
  getDetails: (matchId: string) =>
    request<{
      match: import('@/types').Match & {
        sport_name: string;
        result_format: 'goals' | 'points' | 'runs_wickets' | 'sets';
        home_team_name: string;
        away_team_name: string;
        result_summary: string | null;
        man_of_the_match_id: string | null;
        man_of_the_match_name: string | null;
        best_scorer_id: string | null;
        best_scorer_name: string | null;
        best_scorer_value: number | null;
        extra_result_data: Record<string, unknown>;
      };
      events: import('@/types').ScoreEvent[];
      top_scorers: Array<{ player_name: string; count: number }>;
    }>(`/matches/${matchId}/details`),

  updateResult: (
    matchId: string,
    data: {
      score_home: number;
      score_away: number;
      man_of_the_match_id?: string;
      best_scorer_id?: string;
      best_scorer_value?: number;
      extra_result_data?: Record<string, unknown>;
    }
  ) =>
    request<{ match: import('@/types').Match; result_summary: string }>(`/matches/${matchId}/result`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};