import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || getOrCreateDeviceUid(),
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous ?? true,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

const WORKSPACE_ID_STORAGE_KEY = 'martia_cloud_workspace_id_v1';
const AUTO_SYNC_STORAGE_KEY = 'martia_cloud_auto_sync_v1';
const DEVICE_UID_STORAGE_KEY = 'martia_cloud_device_uid_v1';
const COLLABORATOR_NAME_STORAGE_KEY = 'martia_cloud_collaborator_name_v1';
const DEFAULT_WORKSPACE_ID = 'martia-shared-main';

function getOrCreateDeviceUid(): string {
  if (typeof window === 'undefined') return 'device-server';
  try {
    const existing = localStorage.getItem(DEVICE_UID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) {
      return existing;
    }
    const generated = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_UID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'dev-local-fallback';
  }
}

function getStoredCollaboratorName(): string {
  if (typeof window === 'undefined') return 'کاربر ۱';
  try {
    const val = localStorage.getItem(COLLABORATOR_NAME_STORAGE_KEY)?.trim();
    if (val) return val.slice(0, 60);
  } catch {}
  return 'کاربر ۱';
}

function getStoredWorkspaceId(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_ID;
  try {
    const val = localStorage.getItem(WORKSPACE_ID_STORAGE_KEY)?.trim();
    if (val && /^[a-zA-Z0-9_-]{6,128}$/.test(val)) {
      return val;
    }
  } catch {}
  return DEFAULT_WORKSPACE_ID;
}

function getStoredAutoSync(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
    if (val === '0') return false;
  } catch {}
  return true;
}

function sanitizeWorkspaceId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (cleaned.length < 6) {
    return DEFAULT_WORKSPACE_ID;
  }
  return cleaned;
}

export interface CloudSyncStatus {
  isConnected: boolean;
  deviceUid: string;
  collaboratorName: string;
  workspaceId: string;
  autoSyncEnabled: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastUpdatedByName: string | null;
  syncRevision: number;
  errorMessage: string | null;
}

type StatusListener = (status: CloudSyncStatus) => void;
type RemotePayloadApplyHandler = (payload: any) => Promise<void>;
type LocalPayloadExportHandler = () => Promise<any>;

let currentStatus: CloudSyncStatus = {
  isConnected: false,
  deviceUid: getOrCreateDeviceUid(),
  collaboratorName: getStoredCollaboratorName(),
  workspaceId: getStoredWorkspaceId(),
  autoSyncEnabled: getStoredAutoSync(),
  isSyncing: false,
  lastSyncedAt: null,
  lastUpdatedByName: null,
  syncRevision: 0,
  errorMessage: null,
};

const statusListeners = new Set<StatusListener>();
let activeSnapshotUnsubscribe: Unsubscribe | null = null;
let remotePayloadHandler: RemotePayloadApplyHandler | null = null;
let localExportHandler: LocalPayloadExportHandler | null = null;
let isApplyingRemoteSnapshot = false;
let lastAppliedPayloadHash = '';
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function notifyStatusListeners() {
  const snapshot = { ...currentStatus };
  statusListeners.forEach((cb) => cb(snapshot));
}

function updateStatus(partial: Partial<CloudSyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyStatusListeners();
}

function startRealtimeWorkspaceSubscription() {
  if (activeSnapshotUnsubscribe) {
    activeSnapshotUnsubscribe();
    activeSnapshotUnsubscribe = null;
  }

  if (typeof window === 'undefined' || !currentStatus.autoSyncEnabled) {
    updateStatus({ isConnected: false });
    return;
  }

  const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
  const docPath = `workspaces/${wsId}`;
  const docRef = doc(db, 'workspaces', wsId);

  activeSnapshotUnsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      updateStatus({ isConnected: true, errorMessage: null });

      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data();
      if (!data || typeof data.payloadJson !== 'string') return;

      const incomingRev = typeof data.syncRevision === 'number' ? data.syncRevision : 1;
      const updatedByName =
        typeof data.lastUpdatedByName === 'string' ? data.lastUpdatedByName : 'کاربر همکار';

      updateStatus({
        isConnected: true,
        syncRevision: incomingRev,
        lastUpdatedByName: updatedByName,
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
      });

      if (data.payloadJson === lastAppliedPayloadHash) {
        return;
      }

      if (remotePayloadHandler) {
        try {
          isApplyingRemoteSnapshot = true;
          lastAppliedPayloadHash = data.payloadJson;
          const parsedPayload = JSON.parse(data.payloadJson);
          await remotePayloadHandler(parsedPayload);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('martia:cloud-sync-updated'));
          }
        } catch (err) {
          console.error('Failed to apply remote cloud workspace payload:', err);
        } finally {
          isApplyingRemoteSnapshot = false;
        }
      }
    },
    (error) => {
      updateStatus({
        isConnected: false,
        errorMessage: 'خطا در اتصال زنده به دیتابیس ابری. لطفاً اتصال اینترنت را بررسی کنید.',
      });
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch {}
    }
  );
}

export const firebaseCloudSync = {
  registerDataBridge(
    exportFn: LocalPayloadExportHandler,
    applyRemoteFn: RemotePayloadApplyHandler
  ) {
    localExportHandler = exportFn;
    remotePayloadHandler = applyRemoteFn;
    if (typeof window !== 'undefined') {
      startRealtimeWorkspaceSubscription();
    }
  },

  getStatus(): CloudSyncStatus {
    return { ...currentStatus };
  },

  subscribeStatus(listener: StatusListener): () => void {
    statusListeners.add(listener);
    listener({ ...currentStatus });
    return () => {
      statusListeners.delete(listener);
    };
  },

  setCollaboratorName(name: string) {
    const cleanName = (name.trim() || 'کاربر ۱').slice(0, 60);
    try {
      localStorage.setItem(COLLABORATOR_NAME_STORAGE_KEY, cleanName);
    } catch {}
    updateStatus({ collaboratorName: cleanName });
  },

  setWorkspaceId(newWorkspaceId: string) {
    const cleanId = sanitizeWorkspaceId(newWorkspaceId);
    try {
      localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, cleanId);
    } catch {}
    lastAppliedPayloadHash = '';
    updateStatus({
      workspaceId: cleanId,
      syncRevision: 0,
      errorMessage: null,
    });
    startRealtimeWorkspaceSubscription();
  },

  setAutoSyncEnabled(enabled: boolean) {
    try {
      localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? '1' : '0');
    } catch {}
    updateStatus({ autoSyncEnabled: enabled });
    if (enabled) {
      startRealtimeWorkspaceSubscription();
    } else if (activeSnapshotUnsubscribe) {
      activeSnapshotUnsubscribe();
      activeSnapshotUnsubscribe = null;
      updateStatus({ isConnected: false });
    }
  },

  async pushToCloudNow(): Promise<void> {
    if (!localExportHandler) return;
    if (isApplyingRemoteSnapshot) return;

    const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
    const docPath = `workspaces/${wsId}`;
    const docRef = doc(db, 'workspaces', wsId);
    const deviceUid = getOrCreateDeviceUid();
    const displayName = (currentStatus.collaboratorName || 'کاربر ۱').slice(0, 120);

    updateStatus({ isSyncing: true, errorMessage: null });

    try {
      const payloadObj = await localExportHandler();
      const serialized = JSON.stringify(payloadObj);

      if (serialized.length > 940000) {
        updateStatus({
          isSyncing: false,
          errorMessage: 'حجم داده‌ها از سقف مجاز سند ابری (۹۵۰ کیلوبایت) بیشتر است.',
        });
        return;
      }

      lastAppliedPayloadHash = serialized;

      let existingSnap;
      try {
        existingSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, docPath);
      }

      if (!existingSnap || !existingSnap.exists()) {
        try {
          await setDoc(docRef, {
            workspaceId: wsId,
            ownerId: deviceUid,
            lastUpdatedByUid: deviceUid,
            lastUpdatedByName: displayName,
            payloadJson: serialized,
            syncRevision: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          updateStatus({
            isConnected: true,
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
            lastUpdatedByName: displayName,
            syncRevision: 1,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, docPath);
        }
      } else {
        const existingData = existingSnap.data();
        const nextRev =
          (typeof existingData?.syncRevision === 'number' ? existingData.syncRevision : 1) + 1;
        try {
          await updateDoc(docRef, {
            lastUpdatedByUid: deviceUid,
            lastUpdatedByName: displayName,
            payloadJson: serialized,
            syncRevision: nextRev,
            updatedAt: serverTimestamp(),
          });
          updateStatus({
            isConnected: true,
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
            lastUpdatedByName: displayName,
            syncRevision: nextRev,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, docPath);
        }
      }
    } catch (err: any) {
      updateStatus({
        isSyncing: false,
        errorMessage: 'خطا در ارسال اطلاعات به دیتابیس ابری.',
      });
      throw err;
    }
  },

  async pullFromCloudNow(): Promise<boolean> {
    if (!remotePayloadHandler) return false;

    const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
    const docPath = `workspaces/${wsId}`;
    const docRef = doc(db, 'workspaces', wsId);

    updateStatus({ isSyncing: true, errorMessage: null });

    try {
      let snap;
      try {
        snap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, docPath);
      }

      if (!snap || !snap.exists()) {
        updateStatus({
          isSyncing: false,
          errorMessage:
            'هنوز اطلاعاتی در این کد اتاق مشترک ذخیره نشده است. ابتدا دکمه «ارسال فوری اطلاعات به ابر (Push)» را بزنید.',
        });
        return false;
      }

      const data = snap.data();
      if (!data || typeof data.payloadJson !== 'string') {
        updateStatus({ isSyncing: false });
        return false;
      }

      isApplyingRemoteSnapshot = true;
      lastAppliedPayloadHash = data.payloadJson;
      const parsed = JSON.parse(data.payloadJson);
      await remotePayloadHandler(parsed);

      updateStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        lastUpdatedByName: data.lastUpdatedByName || 'کاربر همکار',
        syncRevision: typeof data.syncRevision === 'number' ? data.syncRevision : 1,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('martia:cloud-sync-updated'));
      }
      return true;
    } finally {
      isApplyingRemoteSnapshot = false;
    }
  },

  scheduleAutoPush() {
    if (!currentStatus.autoSyncEnabled) return;
    if (isApplyingRemoteSnapshot) return;

    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer);
    }
    pushDebounceTimer = setTimeout(() => {
      this.pushToCloudNow().catch((err) => {
        console.error('Auto cloud sync push error:', err);
      });
    }, 600);
  },
};
