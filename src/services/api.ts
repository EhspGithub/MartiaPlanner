/**
 * MartiaPlanner — Frontend API Client Service
 * Communicates with the SQLite backend endpoints (/api/*) with strict TypeScript contracts.
 */
import type {
  AppBootstrapData,
  DailyPlanItem,
  DashboardMetrics,
  Subject,
  SubjectUnit,
  ActivityCategory,
  StudyActivityType,
  PriorityLevel,
} from '../types.ts';

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `خطا در ارتباط با سرور (${res.status})`);
  }
  return data as T;
}

export const api = {
  getBootstrap: () => requestJSON<AppBootstrapData>('/api/bootstrap'),

  // Plans
  getPlansByDate: (date: string) =>
    requestJSON<DailyPlanItem[]>(`/api/plans?date=${encodeURIComponent(date)}`),

  getPlansByRange: (startDate: string, endDate: string) =>
    requestJSON<DailyPlanItem[]>(
      `/api/plans?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),

  createPlan: (payload: {
    plan_date: string;
    category_id: string;
    subject_id?: string | null;
    unit_id?: string | null;
    study_type_id?: string | null;
    priority_code: string;
    predicted_minutes: number;
    description: string;
  }) =>
    requestJSON<DailyPlanItem>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePlan: (
    id: string,
    payload: {
      category_id?: string;
      subject_id?: string | null;
      unit_id?: string | null;
      study_type_id?: string | null;
      priority_code?: string;
      predicted_minutes?: number;
      description?: string;
    }
  ) =>
    requestJSON<DailyPlanItem>(`/api/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  reorderPlans: (planIds: string[]) =>
    requestJSON<{ success: boolean }>('/api/plans/reorder', {
      method: 'POST',
      body: JSON.stringify({ planIds }),
    }),

  deletePlan: (id: string) =>
    requestJSON<{ success: boolean }>(`/api/plans/${id}`, {
      method: 'DELETE',
    }),

  // Performance
  savePerformance: (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: string | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) =>
    requestJSON<DailyPlanItem>(`/api/plans/${planId}/performance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deletePerformance: (planId: string) =>
    requestJSON<DailyPlanItem>(`/api/plans/${planId}/performance`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboardMetrics: (range: 'today' | 'week' | 'month', date: string) =>
    requestJSON<DashboardMetrics>(
      `/api/dashboard?range=${encodeURIComponent(range)}&date=${encodeURIComponent(date)}`
    ),

  // Subjects & Units
  createSubject: (payload: {
    name: string;
    grade_level: string;
    unit_type_label: string;
    color_code: string;
    initial_units?: string[];
  }) =>
    requestJSON<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSubject: (
    id: string,
    payload: {
      name: string;
      grade_level?: string;
      unit_type_label?: string;
      color_code?: string;
    }
  ) =>
    requestJSON<Subject>(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSubject: (id: string) =>
    requestJSON<{ success: boolean }>(`/api/subjects/${id}`, {
      method: 'DELETE',
    }),

  createUnit: (subjectId: string, title: string) =>
    requestJSON<SubjectUnit>(`/api/subjects/${subjectId}/units`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateUnit: (unitId: string, payload: { title?: string; sort_order?: number }) =>
    requestJSON<SubjectUnit>(`/api/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  reorderUnits: (subjectId: string, unitIds: string[]) =>
    requestJSON<{ success: boolean }>(`/api/subjects/${subjectId}/units/reorder`, {
      method: 'POST',
      body: JSON.stringify({ unitIds }),
    }),

  deleteUnit: (unitId: string) =>
    requestJSON<{ success: boolean }>(`/api/units/${unitId}`, {
      method: 'DELETE',
    }),

  // Settings
  createCategory: (payload: { title: string; is_study: number; color?: string }) =>
    requestJSON<ActivityCategory>('/api/settings/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: string, payload: { title: string; is_study?: number; color?: string }) =>
    requestJSON<ActivityCategory>(`/api/settings/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string) =>
    requestJSON<{ success: boolean }>(`/api/settings/categories/${id}`, {
      method: 'DELETE',
    }),

  createStudyType: (payload: { title: string; description: string; badge_color?: string }) =>
    requestJSON<StudyActivityType>('/api/settings/study-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStudyType: (
    id: string,
    payload: { title: string; description?: string; badge_color?: string }
  ) =>
    requestJSON<StudyActivityType>(`/api/settings/study-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteStudyType: (id: string) =>
    requestJSON<{ success: boolean }>(`/api/settings/study-types/${id}`, {
      method: 'DELETE',
    }),

  updatePriority: (code: string, payload: { label: string; color_code?: string }) =>
    requestJSON<PriorityLevel>(`/api/settings/priorities/${code}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Backup
  exportBackup: () => requestJSON<any>('/api/backup/export'),

  importBackup: (payload: any) =>
    requestJSON<{ success: boolean }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // GitHub Sync
  getGitHubStatus: () =>
    requestJSON<{
      oauthConfigured: boolean;
      hasStoredToken: boolean;
      defaultRepo: string;
      appUrl: string;
    }>('/api/github/status'),

  getGitHubAuthUrl: () => requestJSON<{ url: string }>('/api/auth/github/url'),

  pushToGitHub: (payload: {
    token?: string;
    repoName: string;
    commitMessage?: string;
    isPrivate?: boolean;
  }) =>
    requestJSON<{
      success: boolean;
      repoUrl: string;
      owner: string;
      repo: string;
      branch: string;
      filesCount: number;
      commitSha: string;
      createdNewRepo: boolean;
    }>('/api/github/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
