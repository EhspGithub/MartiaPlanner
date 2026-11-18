/**
 * MartiaPlanner — Standalone Portable HTML Exporter & Downloader
 *
 * Solves the Cloud Run / AI Studio hosting proxy cookie interstitial bug:
 * Static <a href="/MartiaPlanner-vX.Y.Z.html" download> links cause Android/Chrome's
 * external DownloadManager to request the file without the active session cookie,
 * returning a 3KB error page ("Action required to load your app... security cookie").
 *
 * This module:
 * 1. Fetches the bundle with active in-app credentials and verifies the payload
 *    contains the real application bundle (`martia-bundle-script`).
 * 2. Falls back to cloning the active inline bundle when already running in Single-File mode.
 * 3. Strips any PWA service-worker/manifest tags that fail on file:// or content://.
 * 4. Optionally embeds the user's complete database snapshot inside the HTML file
 *    (`Portable App + Current Data`) so it opens anywhere completely offline with all user records.
 */

import { APP_VERSION } from '../version.ts';
import { api } from '../services/api.ts';

export interface StandaloneDownloadResult {
  fileName: string;
  sizeBytes: number;
  includedData: boolean;
}

function buildInlineSnapshotHtml(): string | null {
  if (typeof document === 'undefined') return null;
  const styleEl = document.getElementById('martia-bundle-styles');
  const scriptEl = document.getElementById('martia-bundle-script');
  if (!styleEl || !scriptEl) return null;

  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>MartiaPlanner v${APP_VERSION} — سامانه مدیریت مطالعه دانش‌آموزی (آفلاین)</title>
    <script>window.__MARTIA_SINGLEFILE_MODE__ = true;</script>
    <style id="martia-bundle-styles">\n${styleEl.textContent || ''}\n</style>
  </head>
  <body class="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
    <div id="root"></div>
    <script type="module" id="martia-bundle-script">\n${scriptEl.textContent || ''}\n</script>
  </body>
</html>`;
}

function sanitizeSingleFileHtml(html: string): string {
  return html
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, '')
    .replace(/<script[^>]+vite-plugin-pwa:register-sw[^>]*><\/script>/gi, '')
    .replace(/<script[^>]+registerSW\.js[^>]*><\/script>/gi, '');
}

function injectEmbeddedDataIntoHtml(html: string, backupPayload: any): string {
  const cleanedHtml = html
    .replace(/<script[^>]+id=["']martia-embedded-backup["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+id=["']martia-embedded-backup-init["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const safeJson = JSON.stringify(backupPayload).replace(/<\/script/gi, '<\\/script');
  const embeddedTags = `<script id="martia-embedded-backup" type="application/json">${safeJson}</script>
<script id="martia-embedded-backup-init">try{window.__MARTIA_SINGLEFILE_MODE__=true;var el=document.getElementById('martia-embedded-backup');if(el&&el.textContent){window.__MARTIA_EMBEDDED_BACKUP__=JSON.parse(el.textContent);}}catch(e){}</script>`;

  if (cleanedHtml.includes('<script type="module" id="martia-bundle-script"')) {
    return cleanedHtml.replace(
      '<script type="module" id="martia-bundle-script"',
      `${embeddedTags}\n<script type="module" id="martia-bundle-script"`
    );
  }
  if (cleanedHtml.includes('</body>')) {
    return cleanedHtml.replace('</body>', `${embeddedTags}\n</body>`);
  }
  return `${cleanedHtml}\n${embeddedTags}`;
}

export async function downloadStandaloneAppHtml(options?: {
  includeUserData?: boolean;
}): Promise<StandaloneDownloadResult> {
  const includeUserData = Boolean(options?.includeUserData);
  const targetUrl = `/MartiaPlanner-v${APP_VERSION}.html`;
  let htmlContent: string | null = null;

  // 1. If already running inside standalone Single-File HTML, clone directly
  htmlContent = buildInlineSnapshotHtml();

  // 2. Otherwise fetch from authenticated same-origin server and verify bundle integrity
  if (!htmlContent && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    const res = await fetch(targetUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });

    if (!res.ok) {
      throw new Error(
        `دریافت فایل HTML مستقل از سرور با خطا مواجه شد (کد ${res.status}).`
      );
    }

    const text = await res.text();
    const isProxyErrorPage =
      text.includes('Action required to load your app') ||
      text.includes('blocking a required security cookie') ||
      !text.includes('martia-bundle-script');

    if (isProxyErrorPage) {
      throw new Error(
        'بسته تک‌فایل HTML به‌دلیل فیلتر نشست میزبانی دریافت نشد. لطفاً صفحه را یک‌بار Refresh کرده و مجدداً دانلود کنید.'
      );
    }

    htmlContent = text;
  }

  if (!htmlContent) {
    throw new Error(
      'فایل تک‌صفحه‌ای HTML در دسترس نیست. در محیط سرور ابتدا دستور build:singlefile را اجرا کنید.'
    );
  }

  htmlContent = sanitizeSingleFileHtml(htmlContent);

  if (includeUserData) {
    const backupPayload = await api.exportBackup();
    htmlContent = injectEmbeddedDataIntoHtml(htmlContent, backupPayload);
  }

  const fileName = includeUserData
    ? `MartiaPlanner-v${APP_VERSION}-Portable-WithData.html`
    : `MartiaPlanner-v${APP_VERSION}.html`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 5000);

  return {
    fileName,
    sizeBytes: blob.size,
    includedData: includeUserData,
  };
}
