import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { firebaseCloudSync, type CloudSyncStatus } from '../services/firebaseCloudSync.ts';
import { toPersianDigits } from '../utils/jalali.ts';

interface CloudSyncPanelProps {
  onDataSynced?: () => Promise<void>;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onDataSynced }) => {
  const [status, setStatus] = useState<CloudSyncStatus>(() => firebaseCloudSync.getStatus());
  const [workspaceInput, setWorkspaceInput] = useState<string>(status.workspaceId);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedWorkspace, setCopiedWorkspace] = useState<boolean>(false);

  useEffect(() => {
    const unsub = firebaseCloudSync.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setActionError(null);
      setActionMessage(null);
      await firebaseCloudSync.signInWithGoogle();
      setActionMessage('اتصال به حساب گوگل و دیتابیس ابری زنده (Firebase Firestore) با موفقیت برقرار شد.');
    } catch (err: any) {
      setActionError(err?.message || 'خطا در ورود با حساب گوگل. لطفاً پنجره پاپ‌آپ مرورگر را بررسی کنید.');
    }
  };

  const handleSignOut = async () => {
    try {
      setActionError(null);
      setActionMessage(null);
      await firebaseCloudSync.signOutFromCloud();
      setActionMessage('از حساب ابری خارج شدید. برنامه در حالت حافظه محلی به کار خود ادامه می‌دهد.');
    } catch (err: any) {
      setActionError(err?.message || 'خطا در خروج از حساب ابری');
    }
  };

  const handleSaveWorkspaceId = () => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.setWorkspaceId(workspaceInput);
    setActionMessage(
      `کد اتاق مشترک ابری روی «${firebaseCloudSync.getStatus().workspaceId}» تنظیم شد.`
    );
  };

  const handleCopyWorkspaceId = async () => {
    try {
      await navigator.clipboard.writeText(status.workspaceId);
      setCopiedWorkspace(true);
      setTimeout(() => setCopiedWorkspace(false), 2000);
    } catch {}
  };

  const handlePushNow = async () => {
    try {
      setActionError(null);
      setActionMessage(null);
      await firebaseCloudSync.pushToCloudNow();
      setActionMessage(
        'تمامی اطلاعات شما با موفقیت در دیتابیس ابری ذخیره شد و هم‌اکنون برای سایر اعضای این اتاق مشترک قابل مشاهده است.'
      );
    } catch (err: any) {
      setActionError('خطا در ارسال اطلاعات به دیتابیس ابری. لطفاً اتصال اینترنت را بررسی کنید.');
    }
  };

  const handlePullNow = async () => {
    try {
      setActionError(null);
      setActionMessage(null);
      const ok = await firebaseCloudSync.pullFromCloudNow();
      if (ok) {
        if (onDataSynced) {
          await onDataSynced();
        }
        setActionMessage('آخرین اطلاعات ذخیره‌شده در دیتابیس ابری با موفقیت دریافت و جایگزین شد.');
      }
    } catch (err: any) {
      setActionError('خطا در دریافت اطلاعات از دیتابیس ابری.');
    }
  };

  return (
    <div
      dir="rtl"
      className="rounded-3xl border-2 border-emerald-300/90 dark:border-emerald-800/70 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 p-5 sm:p-6 shadow-md space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-200/70 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                دیتابیس ابری زنده و مشترک (Firebase Firestore Cloud Sync)
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  status.isAuthenticated
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status.isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {status.isAuthenticated
                    ? 'متصل به دیتابیس ابری زنده'
                    : 'آماده اتصال (نیازمند ورود با گوگل)'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed text-justify">
              با فعال‌سازی این بخش، اطلاعات برنامه (دروس، برنامه‌های روزانه، ساعات مطالعه، تست‌ها و ضرایب) در{' '}
              <strong className="text-emerald-700 dark:text-emerald-300">
                دیتابیس ابری گوگل (Firestore)
              </strong>{' '}
              ذخیره می‌شود. اگر <strong>فرد A</strong> و <strong>فرد B</strong> روی لینک گیت‌هاب یا هر دستگاه دیگری با حساب گوگل وارد شوند و <strong>کد اتاق مشترک</strong> یکسانی داشته باشند، هر تغییری که فرد A ثبت کند در همان لحظه برای فرد B نمایش داده می‌شود.
            </p>
          </div>
        </div>

        {/* Auth Button */}
        <div className="shrink-0">
          {!status.isAuthenticated ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>ورود با گوگل و اتصال به دیتابیس ابری</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2">
              <div className="text-right">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {status.userName}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {status.userEmail}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-bold transition-colors cursor-pointer"
                title="خروج از حساب ابری"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Room ID & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shared Room Code Box */}
        <div className="rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>کد اتاق مشترک (Shared Workspace ID)</span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {status.workspaceId}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            برای اینکه فرد A و فرد B دقیقاً یک دیتابیس مشترک را ببینند، کافی است هر دو از یک کد یکسان (مثلاً کد پیش‌فرض{' '}
            <code className="font-mono text-indigo-600 dark:text-indigo-300 font-bold">
              martia-shared-main
            </code>
            ) استفاده کنند.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={workspaceInput}
              onChange={(e) => setWorkspaceInput(e.target.value)}
              placeholder="martia-shared-main"
              className="flex-1 min-w-[160px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <button
              type="button"
              onClick={handleSaveWorkspaceId}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-colors cursor-pointer"
            >
              ثبت کد اتاق
            </button>
            <button
              type="button"
              onClick={handleCopyWorkspaceId}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              title="کپی کد اتاق مشترک"
            >
              {copiedWorkspace ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی کد</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Actions & Status Box */}
        <div className="rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={status.autoSyncEnabled}
                onChange={(e) => firebaseCloudSync.setAutoSyncEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                همگام‌سازی خودکار و زنده (Real-time Auto-Sync)
              </span>
            </label>

            {status.syncRevision > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                نسخه ابری: #{toPersianDigits(status.syncRevision)}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            {status.lastUpdatedByName ? (
              <div>
                آخرین تغییر در ابر توسط:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {status.lastUpdatedByName}
                </strong>
              </div>
            ) : (
              <div>
                پس از ورود با گوگل، اولین نفری که دکمه «ارسال به ابر» را بزند یا برنامه‌ای ثبت کند، دیتابیس مشترک را مقداردهی می‌کند.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={!status.isAuthenticated || status.isSyncing}
              onClick={handlePushNow}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer"
            >
              {status.isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>ارسال فوری اطلاعات به ابر (Push)</span>
            </button>

            <button
              type="button"
              disabled={!status.isAuthenticated || status.isSyncing}
              onClick={handlePullNow}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer"
            >
              <CloudDownload className="w-4 h-4" />
              <span>دریافت آخرین اطلاعات از ابر (Pull)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {(actionMessage || status.errorMessage || actionError) && (
        <div className="space-y-2">
          {actionMessage && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-3.5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}
          {(actionError || status.errorMessage) && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 px-3.5 py-2.5 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError || status.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
