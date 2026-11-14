/**
 * Unified Data Access Layer for MartiaPlanner
 * Automatically connects to the SQLite backend server when running in Web/Full-Stack mode,
 * and seamlessly falls back to the built-in Local SQLite Engine when running as a
 * standalone Tauri 2 Desktop (Windows) or Mobile (Android) app or Single-File Portable HTML.
 *
 * Includes intelligent in-flight request deduplication, range-aware plan caching,
 * and automatic cache invalidation on all mutations for instantaneous tab/filter switching.
 */
import type {
  AppBootstrapData,
  DailyPlanItem,
  DashboardMetrics,
  Subject,
  SubjectUnit,
  ActivityCategory,
  ActivityGroupType,
  StudyActivityType,
  PriorityLevel,
  DailyStudyGoalConfig,
  DailyTimeBudgetConfig,
} from '../types.ts';
import { localSQLiteFallback } from './localSqliteFallback.ts';

let serverAvailable: boolean | null = null;

// ============================================================================
// REACTIVE CACHE & IN-FLIGHT DEDUPLICATION LAYER
// ============================================================================
let cachedBootstrap: AppBootstrapData | null = null;
let cachedAllTimePlans: DailyPlanItem[] | null = null;
let allTimePlansPromise: Promise<DailyPlanItem[]> | null = null;

const plansRangeCache = new Map<string, DailyPlanItem[]>();
const plansByDateCache = new Map<string, DailyPlanItem[]>();
const budgetsRangeCache = new Map<string, DailyTimeBudgetConfig[]>();
const budgetByDateCache = new Map<string, DailyTimeBudgetConfig>();
const goalsRangeCache = new Map<string, DailyStudyGoalConfig[]>();
const goalByDateCache = new Map<string, DailyStudyGoalConfig>();
const dashboardMetricsCache = new Map<string, DashboardMetrics>();
const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(
  scope: 'all' | 'plans' | 'bootstrap' | 'budgets' | 'goals' = 'all'
) {
  if (scope === 'all' || scope === 'bootstrap') {
    cachedBootstrap = null;
  }
  if (scope === 'all' || scope === 'plans') {
    cachedAllTimePlans = null;
    allTimePlansPromise = null;
    plansRangeCache.clear();
    plansByDateCache.clear();
    dashboardMetricsCache.clear();
  }
  if (scope === 'all' || scope === 'budgets') {
    budgetsRangeCache.clear();
    budgetByDateCache.clear();
  }
  if (scope === 'all' || scope === 'goals') {
    goalsRangeCache.clear();
    goalByDateCache.clear();
  }
}

function deduplicateRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;
  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

function slicePlansByDate(allPlans: DailyPlanItem[], date: string): DailyPlanItem[] {
  return allPlans
    .filter((p) => p.plan_date === date)
    .sort((a, b) => a.custom_sort_order - b.custom_sort_order);
}

function slicePlansByRange(
  allPlans: DailyPlanItem[],
  startDate: string,
  endDate: string
): DailyPlanItem[] {
  return allPlans
    .filter((p) => p.plan_date >= startDate && p.plan_date <= endDate)
    .sort(
      (a, b) =>
        a.plan_date.localeCompare(b.plan_date) || a.custom_sort_order - b.custom_sort_order
    );
}

async function request<T>(
  path: string,
  options: RequestInit | undefined,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  // When opened directly via file:// (Single-File Portable HTML), use local engine immediately
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    serverAvailable = false;
    return await fallbackFn();
  }

  if (serverAvailable === false) {
    return await fallbackFn();
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      serverAvailable = false;
      return await fallbackFn();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در اجرای درخواست');
    }
    serverAvailable = true;
    return data as T;
  } catch (err: any) {
    if (
      err instanceof TypeError ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError')
    ) {
      serverAvailable = false;
      return await fallbackFn();
    }
    throw err;
  }
}

export const api = {
  invalidateCache: invalidateApiCache,

  getBootstrap(): Promise<AppBootstrapData> {
    if (cachedBootstrap) return Promise.resolve(cachedBootstrap);
    return deduplicateRequest('bootstrap', async () => {
      const data = await request('/api/bootstrap', undefined, () =>
        localSQLiteFallback.getBootstrap()
      );
      cachedBootstrap = data;
      return data;
    });
  },

  getPlansByDate(date: string): Promise<DailyPlanItem[]> {
    if (cachedAllTimePlans) {
      return Promise.resolve(slicePlansByDate(cachedAllTimePlans, date));
    }
    const cached = plansByDateCache.get(date);
    if (cached) return Promise.resolve(cached);
    if (allTimePlansPromise) {
      return allTimePlansPromise.then((all) => slicePlansByDate(all, date));
    }

    return deduplicateRequest(`plans:date:${date}`, async () => {
      const rows = await request(
        `/api/plans?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getPlansByDate(date)
      );
      plansByDateCache.set(date, rows);
      return rows;
    });
  },

  getPlansByRange(startDate: string, endDate: string): Promise<DailyPlanItem[]> {
    const isAllTimeQuery = startDate <= '2020-01-01' && endDate >= '2099-12-31';

    if (cachedAllTimePlans) {
      return Promise.resolve(
        isAllTimeQuery
          ? cachedAllTimePlans
          : slicePlansByRange(cachedAllTimePlans, startDate, endDate)
      );
    }

    if (allTimePlansPromise) {
      return allTimePlansPromise.then((all) =>
        isAllTimeQuery ? all : slicePlansByRange(all, startDate, endDate)
      );
    }

    const rangeKey = `${startDate}:${endDate}`;
    const cachedRange = plansRangeCache.get(rangeKey);
    if (cachedRange) {
      return Promise.resolve(cachedRange);
    }

    const fetchPromise = deduplicateRequest(`plans:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/plans?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getPlansByRange(startDate, endDate)
      );
      if (isAllTimeQuery) {
        cachedAllTimePlans = rows;
      } else {
        plansRangeCache.set(rangeKey, rows);
      }
      return rows;
    });

    if (isAllTimeQuery) {
      allTimePlansPromise = fetchPromise;
    }

    return fetchPromise;
  },

  async createPlan(payload: {
    plan_date: string;
    category_id: string;
    subject_id?: string | null;
    unit_id?: string | null;
    study_type_id?: string | null;
    priority_code: string;
    predicted_minutes: number;
    target_exercises?: number | null;
    reminder_time?: string | null;
    description: string;
  }): Promise<DailyPlanItem> {
    const created = await request(
      '/api/plans',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createPlan(payload)
    );
    invalidateApiCache('plans');
    return created;
  },

  async updatePlan(
    id: string,
    payload: {
      category_id?: string;
      subject_id?: string | null;
      unit_id?: string | null;
      study_type_id?: string | null;
      priority_code?: string;
      predicted_minutes?: number;
      target_exercises?: number | null;
      reminder_time?: string | null;
      description?: string;
    }
  ): Promise<DailyPlanItem> {
    const updated = await request(
      `/api/plans/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updatePlan(id, payload)
    );
    invalidateApiCache('plans');
    return updated;
  },

  async reorderPlans(planIds: string[]): Promise<{ success: boolean }> {
    const res = await request(
      '/api/plans/reorder',
      { method: 'POST', body: JSON.stringify({ planIds }) },
      () => localSQLiteFallback.reorderPlans(planIds)
    );
    invalidateApiCache('plans');
    return res;
  },

  async deletePlan(id: string): Promise<{ success: boolean }> {
    const res = await request(
      `/api/plans/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deletePlan(id)
    );
    invalidateApiCache('plans');
    return res;
  },

  async savePerformance(
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: string | null;
      completion_status: 'completed' | 'partial';
      notes?: string;
    }
  ): Promise<DailyPlanItem> {
    const normalizedPayload = {
      ...payload,
      notes: payload.notes ?? '',
    };
    const saved = await request(
      `/api/plans/${encodeURIComponent(planId)}/performance`,
      { method: 'POST', body: JSON.stringify(normalizedPayload) },
      () => localSQLiteFallback.savePerformance(planId, normalizedPayload)
    );
    invalidateApiCache('plans');
    return saved;
  },

  async deletePerformance(planId: string): Promise<DailyPlanItem> {
    const deleted = await request(
      `/api/plans/${encodeURIComponent(planId)}/performance`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deletePerformance(planId)
    );
    invalidateApiCache('plans');
    return deleted;
  },

  getDashboardMetrics(range: 'today' | 'week' | 'month', refDate: string): Promise<DashboardMetrics> {
    const key = `${range}:${refDate}`;
    const cached = dashboardMetricsCache.get(key);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`dashboard:${key}`, async () => {
      const data = await request(
        `/api/dashboard?range=${encodeURIComponent(range)}&date=${encodeURIComponent(refDate)}`,
        undefined,
        () => localSQLiteFallback.getDashboardMetrics(range, refDate)
      );
      dashboardMetricsCache.set(key, data);
      return data;
    });
  },

  async createSubject(payload: {
    name: string;
    grade_level: string;
    unit_type_label: string;
    color_code: string;
    initial_units?: string[];
  }): Promise<Subject> {
    const created = await request(
      '/api/subjects',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createSubject(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateSubject(
    id: string,
    payload: { name: string; grade_level?: string; unit_type_label?: string; color_code?: string }
  ): Promise<Subject> {
    const updated = await request(
      `/api/subjects/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateSubject(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteSubject(id: string): Promise<{ success: boolean }> {
    const res = await request(
      `/api/subjects/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteSubject(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createUnit(subjectId: string, title: string): Promise<SubjectUnit> {
    const created = await request(
      `/api/subjects/${encodeURIComponent(subjectId)}/units`,
      { method: 'POST', body: JSON.stringify({ title }) },
      () => localSQLiteFallback.createUnit(subjectId, title)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateUnit(
    unitId: string,
    payload: { title?: string; sort_order?: number }
  ): Promise<SubjectUnit> {
    const updated = await request(
      `/api/units/${encodeURIComponent(unitId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateUnit(unitId, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async reorderUnits(subjectId: string, unitIds: string[]): Promise<{ success: boolean }> {
    const res = await request(
      `/api/subjects/${encodeURIComponent(subjectId)}/units/reorder`,
      { method: 'POST', body: JSON.stringify({ unitIds }) },
      () => localSQLiteFallback.reorderUnits(subjectId, unitIds)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async deleteUnit(unitId: string): Promise<{ success: boolean }> {
    const res = await request(
      `/api/units/${encodeURIComponent(unitId)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteUnit(unitId)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createCategory(payload: {
    title: string;
    is_study: number;
    activity_group?: ActivityGroupType;
    impact_weight?: number;
  }): Promise<ActivityCategory> {
    const created = await request(
      '/api/settings/categories',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createCategory(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateCategory(
    id: string,
    payload: {
      title: string;
      is_study?: number;
      activity_group?: ActivityGroupType;
      impact_weight?: number;
    }
  ): Promise<ActivityCategory> {
    const updated = await request(
      `/api/settings/categories/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateCategory(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await request(
      `/api/settings/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteCategory(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async createStudyType(payload: {
    title: string;
    description: string;
  }): Promise<StudyActivityType> {
    const created = await request(
      '/api/settings/study-types',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.createStudyType(payload)
    );
    invalidateApiCache('bootstrap');
    return created;
  },

  async updateStudyType(
    id: string,
    payload: { title: string; description?: string }
  ): Promise<StudyActivityType> {
    const updated = await request(
      `/api/settings/study-types/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updateStudyType(id, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  async deleteStudyType(id: string): Promise<{ success: boolean }> {
    const res = await request(
      `/api/settings/study-types/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => localSQLiteFallback.deleteStudyType(id)
    );
    invalidateApiCache('bootstrap');
    return res;
  },

  async updatePriority(code: string, payload: { label: string }): Promise<PriorityLevel> {
    const updated = await request(
      `/api/settings/priorities/${encodeURIComponent(code)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      () => localSQLiteFallback.updatePriority(code, payload)
    );
    invalidateApiCache('bootstrap');
    return updated;
  },

  exportBackup(): Promise<any> {
    return request('/api/backup/export', undefined, () => localSQLiteFallback.exportBackup());
  },

  async importBackup(payload: any): Promise<{ success: boolean }> {
    const res = await request(
      '/api/backup/import',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.importBackup(payload)
    );
    invalidateApiCache('all');
    return res;
  },

  getDailyGoal(date: string): Promise<DailyStudyGoalConfig> {
    const cached = goalByDateCache.get(date);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`goal:date:${date}`, async () => {
      const data = await request(
        `/api/goals?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getDailyGoal(date)
      );
      goalByDateCache.set(date, data);
      return data;
    });
  },

  getDailyGoalsByRange(startDate: string, endDate: string): Promise<DailyStudyGoalConfig[]> {
    const rangeKey = `${startDate}:${endDate}`;
    const cached = goalsRangeCache.get(rangeKey);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`goal:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/goals?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getDailyGoalsByRange(startDate, endDate)
      );
      goalsRangeCache.set(rangeKey, rows);
      for (const g of rows) {
        goalByDateCache.set(g.goal_date, g);
      }
      return rows;
    });
  },

  async saveDailyGoal(payload: {
    goal_date: string;
    target_study_minutes: number;
    target_exercises_count: number;
    target_completed_tasks: number;
    custom_goals: any[];
  }): Promise<DailyStudyGoalConfig> {
    const saved = await request(
      '/api/goals',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.saveDailyGoal(payload)
    );
    invalidateApiCache('goals');
    goalByDateCache.set(saved.goal_date, saved);
    return saved;
  },

  getTimeBudget(date: string): Promise<DailyTimeBudgetConfig> {
    const cached = budgetByDateCache.get(date);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`budget:date:${date}`, async () => {
      const data = await request(
        `/api/time-budgets?date=${encodeURIComponent(date)}`,
        undefined,
        () => localSQLiteFallback.getTimeBudget(date)
      );
      budgetByDateCache.set(date, data);
      return data;
    });
  },

  getTimeBudgetsByRange(startDate: string, endDate: string): Promise<DailyTimeBudgetConfig[]> {
    const rangeKey = `${startDate}:${endDate}`;
    const cached = budgetsRangeCache.get(rangeKey);
    if (cached) return Promise.resolve(cached);

    return deduplicateRequest(`budget:range:${rangeKey}`, async () => {
      const rows = await request(
        `/api/time-budgets?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        undefined,
        () => localSQLiteFallback.getTimeBudgetsByRange(startDate, endDate)
      );
      budgetsRangeCache.set(rangeKey, rows);
      for (const b of rows) {
        budgetByDateCache.set(b.plan_date, b);
      }
      return rows;
    });
  },

  async saveTimeBudget(payload: {
    plan_date: string;
    budget_minutes: number | null;
    input_unit: 'hours' | 'minutes';
  }): Promise<DailyTimeBudgetConfig> {
    const saved = await request(
      '/api/time-budgets',
      { method: 'POST', body: JSON.stringify(payload) },
      () => localSQLiteFallback.saveTimeBudget(payload)
    );
    invalidateApiCache('budgets');
    budgetByDateCache.set(saved.plan_date, saved);
    return saved;
  },

  getGitHubStatus(): Promise<{
    oauthConfigured: boolean;
    hasStoredToken: boolean;
    defaultRepo: string;
    appUrl: string;
  }> {
    return request(
      '/api/github/status',
      undefined,
      () => ({
        oauthConfigured: false,
        hasStoredToken: false,
        defaultRepo: 'MartiaPlanner',
        appUrl: window.location.origin,
      })
    );
  },

  pushToGitHub(payload: {
    token?: string;
    repoName: string;
    version: string;
    commitMessage: string;
    isPrivate: boolean;
  }): Promise<{
    success: boolean;
    repoUrl: string;
    version: string;
    releaseTag: string;
    filesCount: number;
    commitSha: string;
    branch: string;
    createdNewRepo: boolean;
  }> {
    return request(
      '/api/github/push',
      { method: 'POST', body: JSON.stringify(payload) },
      () => {
        throw new Error('پوش مستقیم به گیت‌هاب فقط در حالت سرور فعال است.');
      }
    );
  },
};

