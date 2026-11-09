/**
 * MartiaPlanner — GitHub Repository Sync Service
 * Pushes all project files (including Tauri 2 Rust/Android configuration, SQLite backend, and React RTL frontend)
 * directly to the user's `MartiaPlanner` repository on GitHub via the GitHub Git Data Trees API.
 */
import fs from 'fs';
import path from 'path';

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'data',
  'target',
  '.aistudio',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  '.DS_Store',
  'martia_planner.sqlite',
  'martia_planner.sqlite-shm',
  'martia_planner.sqlite-wal',
]);

function collectProjectFiles(dirPath: string, baseDir: string): Array<{ relativePath: string; fullPath: string }> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: Array<{ relativePath: string; fullPath: string }> = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...collectProjectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      // Skip large binary files > 2MB
      const stat = fs.statSync(fullPath);
      if (stat.size <= 2 * 1024 * 1024) {
        results.push({ relativePath, fullPath });
      }
    }
  }
  return results;
}

export interface GitHubPushOptions {
  token: string;
  repoName: string; // e.g., "MartiaPlanner" or "username/MartiaPlanner"
  commitMessage?: string;
  isPrivate?: boolean;
}

export interface GitHubPushResult {
  success: boolean;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  filesCount: number;
  commitSha: string;
  createdNewRepo: boolean;
}

async function githubFetch(url: string, token: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'MartiaPlanner-Builder/1.0',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

export async function pushWorkspaceToGitHub(options: GitHubPushOptions): Promise<GitHubPushResult> {
  const { token, commitMessage = 'feat: complete MartiaPlanner (Tauri 2 + React + SQLite)' } = options;
  if (!token || !token.trim()) {
    throw new Error('توکن دسترسی گیت‌هاب (GitHub Token) وارد نشده است.');
  }

  // 1. Verify authenticated user
  const userRes = await githubFetch('https://api.github.com/user', token);
  if (!userRes.ok) {
    throw new Error(
      `خطا در احراز هویت گیت‌هاب (${userRes.status}): توکن معتبر نیست یا دسترسی repo ندارد.`
    );
  }
  const username: string = userRes.data.login;

  // Parse owner & repo
  let owner = username;
  let repo = (options.repoName || 'MartiaPlanner').trim();
  if (repo.includes('/')) {
    const parts = repo.split('/').filter(Boolean);
    owner = parts[0];
    repo = parts[1] || 'MartiaPlanner';
  }

  // 2. Check if repository exists; if not, create it automatically
  let createdNewRepo = false;
  let repoRes = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`, token);

  if (repoRes.status === 404) {
    const createRes = await githubFetch('https://api.github.com/user/repos', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repo,
        description:
          'MartiaPlanner — سامانه مدیریت مطالعه و برنامه‌ریزی روزانه دانش‌آموز (Tauri 2 + React + SQLite)',
        private: Boolean(options.isPrivate),
        auto_init: true,
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `مخزن ${owner}/${repo} یافت نشد و امکان ساخت خودکار آن نبود: ${
          createRes.data?.message || createRes.status
        }`
      );
    }
    createdNewRepo = true;
    repoRes = createRes;
    // Wait briefly for GitHub auto_init commit
    await new Promise((r) => setTimeout(r, 1200));
  } else if (!repoRes.ok) {
    throw new Error(`خطا در بررسی مخزن ${owner}/${repo}: ${repoRes.data?.message || repoRes.status}`);
  }

  const defaultBranch: string = repoRes.data?.default_branch || 'main';

  // 3. Ensure repository is initialized (if it was created completely empty with 0 commits, initialize README via Contents API)
  let refRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    token
  );

  if (refRes.status === 404 || refRes.status === 409) {
    // Empty repository with no commits yet — create initial README via Contents API to bootstrap git database
    const initReadme = Buffer.from(
      '# MartiaPlanner\nسامانه هوشمند مدیریت مطالعه و فعالیت‌های روزانه دانش‌آموز (Tauri 2 + React + SQLite)\n',
      'utf-8'
    ).toString('base64');

    const putRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore: initial repository bootstrap',
          content: initReadme,
          branch: defaultBranch,
        }),
      }
    );

    if (!putRes.ok) {
      throw new Error(
        `مخزن خالی است و مقداردهی اولیه آن با خطا مواجه شد: ${putRes.data?.message || putRes.status}`
      );
    }

    await new Promise((r) => setTimeout(r, 800));
    refRes = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
      token
    );
  }

  if (!refRes.ok) {
    throw new Error(
      `خطا در دریافت شاخه ${defaultBranch} از مخزن: ${refRes.data?.message || refRes.status}`
    );
  }

  const latestCommitSha: string = refRes.data.object.sha;

  // 4. Collect all project files and create Git blobs/tree entries
  const workspaceRoot = process.cwd();
  const files = collectProjectFiles(workspaceRoot, workspaceRoot);

  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha?: string;
    content?: string;
  }> = [];

  for (const file of files) {
    const buffer = fs.readFileSync(file.fullPath);
    // Check if text or binary
    const isBinary = buffer.includes(0);
    if (isBinary) {
      const blobRes = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: buffer.toString('base64'),
            encoding: 'base64',
          }),
        }
      );
      if (blobRes.ok && blobRes.data?.sha) {
        treeItems.push({
          path: file.relativePath,
          mode: '100644',
          type: 'blob',
          sha: blobRes.data.sha,
        });
      }
    } else {
      treeItems.push({
        path: file.relativePath,
        mode: '100644',
        type: 'blob',
        content: buffer.toString('utf-8'),
      });
    }
  }

  // 5. Create Tree
  const treeRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: latestCommitSha,
        tree: treeItems,
      }),
    }
  );

  if (!treeRes.ok) {
    throw new Error(`خطا در ساخت درخت فایل‌ها در گیت‌هاب: ${treeRes.data?.message || treeRes.status}`);
  }

  // 6. Create Commit
  const commitRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        tree: treeRes.data.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!commitRes.ok) {
    throw new Error(`خطا در ثبت کامیت در گیت‌هاب: ${commitRes.data?.message || commitRes.status}`);
  }

  // 7. Update branch reference
  const updateRefRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
    token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: commitRes.data.sha,
        force: true,
      }),
    }
  );

  if (!updateRefRes.ok) {
    throw new Error(
      `خطا در به‌روزرسانی شاخه ${defaultBranch}: ${updateRefRes.data?.message || updateRefRes.status}`
    );
  }

  return {
    success: true,
    repoUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    branch: defaultBranch,
    filesCount: treeItems.length,
    commitSha: commitRes.data.sha,
    createdNewRepo,
  };
}
