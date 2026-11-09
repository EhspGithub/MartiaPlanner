/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpen,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import type { AppBootstrapData } from './types.ts';
import { api } from './services/api.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { PlannerView } from './components/PlannerView.tsx';
import { SubjectsView } from './components/SubjectsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

type ActiveMenu = 'dashboard' | 'planner' | 'subjects' | 'settings';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('planner');
  const [bootstrapData, setBootstrapData] = useState<AppBootstrapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const loadBootstrap = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getBootstrap();
      setBootstrapData(data);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با پایگاه داده SQLite');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT
          Zone 1: Single text element wordmark
          Zone 2: 4 concise single-line text navigation links
          Zone 3: Primary action / theme control
      ===================================================================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#planner"
          onClick={(e) => {
            e.preventDefault();
            setActiveMenu('planner');
          }}
          className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          MartiaPlanner
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveMenu('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            داشبورد
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('planner')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'planner'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            برنامه‌ریزی
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('subjects')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'subjects'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            تعریف درس‌ها
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('settings')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMenu === 'settings'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            تنظیمات
          </button>
        </nav>

        {/* Zone 3: Primary Action & Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            aria-label="تغییر پوسته روز و شب"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN VIEWPORT CONTAINER
      ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-24 md:pb-12">
        {loading && (
          <div className="space-y-4 py-8">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
              <div className="h-44 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center space-y-3">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={loadBootstrap}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && bootstrapData && (
          <>
            {activeMenu === 'dashboard' && (
              <DashboardView onNavigateToPlanner={() => setActiveMenu('planner')} />
            )}

            {activeMenu === 'planner' && (
              <PlannerView
                categories={bootstrapData.categories}
                studyTypes={bootstrapData.studyTypes}
                priorities={bootstrapData.priorities}
                subjects={bootstrapData.subjects}
                onDataMutated={loadBootstrap}
              />
            )}

            {activeMenu === 'subjects' && (
              <SubjectsView
                subjects={bootstrapData.subjects}
                onRefreshBootstrap={loadBootstrap}
              />
            )}

            {activeMenu === 'settings' && (
              <SettingsView
                categories={bootstrapData.categories}
                studyTypes={bootstrapData.studyTypes}
                priorities={bootstrapData.priorities}
                onRefreshBootstrap={loadBootstrap}
              />
            )}
          </>
        )}
      </main>

      {/* =====================================================================
          MOBILE FIXED BOTTOM TAB BAR (Ergonomic Thumb Zone for Smartphones)
      ===================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center h-16">
        <button
          type="button"
          onClick={() => setActiveMenu('dashboard')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            activeMenu === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] mt-1 whitespace-nowrap">داشبورد</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenu('planner')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            activeMenu === 'planner'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CalendarCheck2 className="w-5 h-5" />
          <span className="text-[11px] mt-1 whitespace-nowrap">برنامه‌ریزی</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenu('subjects')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            activeMenu === 'subjects'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] mt-1 whitespace-nowrap">تعریف درس‌ها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenu('settings')}
          className={`flex flex-col items-center justify-center h-full cursor-pointer ${
            activeMenu === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] mt-1 whitespace-nowrap">تنظیمات</span>
        </button>
      </nav>
    </div>
  );
}
