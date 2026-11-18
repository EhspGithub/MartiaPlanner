import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Copy,
  Check,
  UserCheck,
  Database,
  KeyRound,
  Code2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  firebaseCloudSync,
  SUPABASE_SETUP_SQL_SCRIPT,
  extractSupabaseProjectRef,
  type CloudSyncStatus,
  type CloudProviderType,
} from '../services/firebaseCloudSync.ts';
import { toPersianDigits } from '../utils/jalali.ts';

interface CloudSyncPanelProps {
  onDataSynced?: () => Promise<void>;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onDataSynced }) => {
  const [status, setStatus] = useState<CloudSyncStatus>(() => firebaseCloudSync.getStatus());
  const [workspaceInput, setWorkspaceInput] = useState<string>(status.workspaceId);
  const [nameInput, setNameInput] = useState<string>(status.collaboratorName);
  const [sbUrlInput, setSbUrlInput] = useState<string>(status.supabaseUrl);
  const [sbKeyInput, setSbKeyInput] = useState<string>(status.supabaseAnonKey);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedWorkspace, setCopiedWorkspace] = useState<boolean>(false);

  useEffect(() => {
    const unsub = firebaseCloudSync.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      if (newStatus.needsSupabaseTableSetup) {
        setShowSqlGuide(true);
      }
    });
    return unsub;
  }, []);

  const supabaseProjectRef = extractSupabaseProjectRef(sbUrlInput || status.supabaseUrl);
  const supabaseSqlEditorUrl = supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${supabaseProjectRef}/sql/new`
    : 'https://supabase.com/dashboard/projects';

  const handleSelectProvider = (provider: CloudProviderType) => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.setProvider(provider);
    setActionMessage(
      provider === 'firebase'
        ? 'موتور همگام‌سازی ابری روی «Google Firebase Firestore (پیش‌فرض)» قرار گرفت.'
        : 'موتور همگام‌سازی ابری روی «Supabase PostgreSQL» قرار گرفت.'
    );
  };

  const handleSaveSupabaseConfig = () => {
    setActionError(null);
    setActionMessage(null);
    const cleanUrl = sbUrlInput.trim();
    const cleanKey = sbKeyInput.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      setActionError('لطفاً آدرس معتبر Project URL سوپابیس (شروع با https://) را وارد کنید.');
      return;
    }
    if (!cleanKey || cleanKey.length < 20) {
      setActionError('لطفاً کلید عمومی (anon / public key) پروژه سوپابیس را به صورت کامل وارد کنید.');
      return;
    }
    firebaseCloudSync.setSupabaseCredentials(cleanUrl, cleanKey);
    setActionMessage('تنظیمات اتصال به پروژه Supabase شما ذخیره شد و در حال بررسی جدول است...');
  };

  const handleCopySqlScript = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {}
  };

  const handleRecheckTableAfterSql = async () => {
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.recheckSupabaseTable();
    const ok = await firebaseCloudSync.pushToCloudNow();
    if (ok) {
      setActionMessage(
        'جدول martia_workspaces در پروژه Supabase شما شناسایی شد و اطلاعات شما با موفقیت در آن ذخیره گردید!'
      );
      setShowSqlGuide(false);
    }
  };

  const handleSaveCollaboratorName = () => {
    firebaseCloudSync.setCollaboratorName(nameInput);
    setActionError(null);
    setActionMessage(`نام نمایشی شما در اتاق مشترک روی «${nameInput.trim() || 'کاربر ۱'}» ثبت شد.`);
  };

  const handleSaveWorkspaceId = () => {
    setActionError(null);
    setActionMessage(null);
    if (workspaceInput.trim().length < 6) {
      setActionError('کد اتاق مشترک باید حداقل ۶ کاراکتر انگلیسی یا عدد باشد (مثلاً martia-shared-main).');
      return;
    }
    firebaseCloudSync.setWorkspaceId(workspaceInput);
    setActionMessage(
      `کد اتاق مشترک ابری روی «${firebaseCloudSync.getStatus().workspaceId}» تنظیم و متصل شد.`
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
    setActionError(null);
    setActionMessage(null);
    firebaseCloudSync.setCollaboratorName(nameInput);
    const ok = await firebaseCloudSync.pushToCloudNow();
    if (ok) {
      setActionMessage(
        `تمامی اطلاعات شما با موفقیت در دیتابیس ابری (${
          status.provider === 'firebase' ? 'Firebase Firestore' : 'Supabase'
        }) ذخیره شد و هم‌اکنون روی گوشی و ویندوز سایر اعضای این اتاق مشترک قابل مشاهده است.`
      );
    }
  };

  const handlePullNow = async () => {
    setActionError(null);
    setActionMessage(null);
    const ok = await firebaseCloudSync.pullFromCloudNow();
    if (ok) {
      if (onDataSynced) {
        await onDataSynced();
      }
      setActionMessage('آخرین اطلاعات ذخیره‌شده در دیتابیس ابری با موفقیت دریافت و جایگزین شد.');
    }
  };

  return (
    <div
      dir="rtl"
      className="rounded-3xl border-2 border-emerald-300/90 dark:border-emerald-800/70 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 p-5 sm:p-6 shadow-md space-y-5"
    >
      {/* Header & Provider Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-emerald-200/70 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                دیتابیس ابری زنده و مشترک (دو موتوره: Firebase و Supabase)
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  status.isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {status.isConnected
                    ? `متصل به ${status.provider === 'firebase' ? 'Firebase Firestore' : 'Supabase'}`
                    : status.provider === 'supabase' && status.needsSupabaseTableSetup
                    ? 'نیازمند اجرای ۱ بار اسکریپت ساخت جدول در Supabase'
                    : status.provider === 'supabase' && !status.isSupabaseConfigured
                    ? 'منتظر وارد کردن کلیدهای Supabase'
                    : status.autoSyncEnabled
                    ? 'آماده همگام‌سازی ابری'
                    : 'همگام‌سازی خودکار غیرفعال'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed text-justify">
              شما می‌توانید به دلخواه خود بین دو سرویس ابری قدرتمند{' '}
              <strong className="text-indigo-700 dark:text-indigo-300">
                Google Firebase Firestore (از پیش متصل و آماده بدون هیچ تنظیمات)
              </strong>{' '}
              یا{' '}
              <strong className="text-emerald-700 dark:text-emerald-300">
                Supabase PostgreSQL (مناسب اینترنت ایران و پروژه‌های شخصی)
              </strong>{' '}
              انتخاب کنید. این قابلیت روی نسخه اندروید (`.apk`)، ویندوز (`.exe`)، لینک گیت‌هاب و فایل HTML بدون نیاز به لاگین جیمیل کار می‌کند.
            </p>
          </div>
        </div>

        {/* Provider Selector Buttons */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => handleSelectProvider('firebase')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              status.provider === 'firebase'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Cloud className="w-4 h-4 shrink-0" />
            <span>۱. Firebase (آماده)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectProvider('supabase')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              status.provider === 'supabase'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>۲. Supabase (انتخابی)</span>
          </button>
        </div>
      </div>

      {/* Supabase Configuration Box (Shown when provider === 'supabase') */}
      {status.provider === 'supabase' && (
        <div className="rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/30 border-2 border-emerald-400/60 dark:border-emerald-700/70 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تنظیمات اتصال مستقیم به پروژه Supabase شما</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlGuide((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold hover:bg-emerald-50 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>راهنمای ۱ دقیقه‌ای و اسکریپت ساخت جدول SQL در Supabase</span>
              {showSqlGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                آدرس پروژه (Supabase Project URL)
              </label>
              <input
                type="text"
                dir="ltr"
                value={sbUrlInput}
                onChange={(e) => setSbUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                کلید عمومی پروژه (Supabase Anon / Public Key)
              </label>
              <input
                type="password"
                dir="ltr"
                value={sbKeyInput}
                onChange={(e) => setSbKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              این مقادیر را از پنل Supabase خود در مسیر{' '}
              <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                Project Settings → API
              </code>{' '}
              کپی کنید.
            </p>
            <button
              type="button"
              onClick={handleSaveSupabaseConfig}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
            >
              ذخیره و فعال‌سازی اتصال Supabase
            </button>
          </div>

          {(showSqlGuide || status.needsSupabaseTableSetup) && (
            <div className="rounded-2xl bg-slate-950 text-slate-100 p-4 border-2 border-amber-500/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-amber-300">
                  گام نهایی (فقط ۱ بار): کد SQL زیر را کپی کرده و در صفحه SQL Editor پروژه Supabase خود Paste و Run کنید:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySqlScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>کپی شد!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>۱. کپی کد SQL ساخت جدول</span>
                      </>
                    )}
                  </button>

                  <a
                    href={supabaseSqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                  >
                    <span>۲. باز کردن مستقیم SQL Editor سوپابیس</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleRecheckTableAfterSql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>۳. اجرا کردم — بررسی و ذخیره در Supabase</span>
                  </button>
                </div>
              </div>
              <pre
                dir="ltr"
                className="text-[11px] font-mono text-emerald-200 bg-slate-900/90 p-3 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed"
              >
                {SUPABASE_SETUP_SQL_SCRIPT}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Workspace Room ID & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shared Room Code & Collaborator Name Box */}
        <div className="rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 p-4 space-y-3.5">
          {/* Collaborator Display Name */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>نام شما در اتاق مشترک (مثلاً: دانش‌آموز / مشاور / فرد A)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="مثلاً: فرد A"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                onClick={handleSaveCollaboratorName}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold transition-colors cursor-pointer"
              >
                ثبت نام
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/70 dark:border-slate-800 pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>کد اتاق مشترک (Shared Workspace ID)</span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {status.workspaceId}
              </span>
            </div>

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
                تغییر اتاق
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
                همگام‌سازی خودکار و زنده ({status.provider === 'firebase' ? 'Firebase' : 'Supabase'})
              </span>
            </label>

            {status.syncRevision > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                نسخه ابری: #{toPersianDigits(status.syncRevision)}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
            {status.lastUpdatedByName ? (
              <div>
                آخرین تغییر ثبت‌شده در ابر توسط:{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">
                  {status.lastUpdatedByName}
                </strong>
              </div>
            ) : (
              <div>
                کافی است نفر اول یک بار دکمه سبز <strong>«ارسال فوری اطلاعات به ابر (Push)»</strong> را بزند؛ از آن لحظه به بعد، تمام تغییرات بین گوشی و ویندوز به صورت خودکار همگام می‌شود.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={status.isSyncing}
              onClick={handlePushNow}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
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
              disabled={status.isSyncing}
              onClick={handlePullNow}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
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
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-3.5 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{actionError || status.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
