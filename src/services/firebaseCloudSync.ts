import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
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
const DEFAULT_WORKSPACE_ID = 'martia-shared-main';

export interface CloudSyncStatus {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
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
  isAuthenticated: false,
  userEmail: null,
  userName: null,
  userPhoto: null,
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

function getStoredWorkspaceId(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_ID;
  try {
    const val = localStorage.getItem(WORKSPACE_ID_STORAGE_KEY)?.trim();
    if (val && /^[a-zA-Z0-9_-]{1,128}$/.test(val)) {
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

function notifyStatusListeners() {
  const snapshot = { ...currentStatus };
  statusListeners.forEach((cb) => cb(snapshot));
}

function updateStatus(partial: Partial<CloudSyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyStatusListeners();
}

function sanitizeWorkspaceId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || DEFAULT_WORKSPACE_ID;
}

function startRealtimeWorkspaceSubscription() {
  if (activeSnapshotUnsubscribe) {
    activeSnapshotUnsubscribe();
    activeSnapshotUnsubscribe = null;
  }

  const user = auth.currentUser;
  if (!user || !currentStatus.autoSyncEnabled) {
    return;
  }

  const wsId = currentStatus.workspaceId;
  const docPath = `workspaces/${wsId}`;
  const docRef = doc(db, 'workspaces', wsId);

  activeSnapshotUnsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data();
      if (!data || typeof data.payloadJson !== 'string') return;

      const incomingRev = typeof data.syncRevision === 'number' ? data.syncRevision : 1;
      const updatedByName =
        typeof data.lastUpdatedByName === 'string' ? data.lastUpdatedByName : 'کاربر همکار';

      updateStatus({
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
        errorMessage: 'خطا در اتصال زنده به دیتابیس ابری. لطفاً اتصال اینترنت یا دسترسی را بررسی کنید.',
      });
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch {}
    }
  );
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      updateStatus({
        isAuthenticated: true,
        userEmail: user.email || null,
        userName: user.displayName || user.email?.split('@')[0] || 'کاربر',
        userPhoto: user.photoURL || null,
        errorMessage: null,
      });
      startRealtimeWorkspaceSubscription();
    } else {
      if (activeSnapshotUnsubscribe) {
        activeSnapshotUnsubscribe();
        activeSnapshotUnsubscribe = null;
      }
      updateStatus({
        isAuthenticated: false,
        userEmail: null,
        userName: null,
        userPhoto: null,
      });
    }
  });
}

export const firebaseCloudSync = {
  registerDataBridge(
    exportFn: LocalPayloadExportHandler,
    applyRemoteFn: RemotePayloadApplyHandler
  ) {
    localExportHandler = exportFn;
    remotePayloadHandler = applyRemoteFn;
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
    }
  },

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    updateStatus({ errorMessage: null });
    await signInWithPopup(auth, provider);
  },

  async signOutFromCloud(): Promise<void> {
    if (activeSnapshotUnsubscribe) {
      activeSnapshotUnsubscribe();
      activeSnapshotUnsubscribe = null;
    }
    await signOut(auth);
  },

  async pushToCloudNow(): Promise<void> {
    const user = auth.currentUser;
    if (!user || !localExportHandler) return;
    if (isApplyingRemoteSnapshot) return;

    const wsId = sanitizeWorkspaceId(currentStatus.workspaceId);
    const docPath = `workspaces/${wsId}`;
    const docRef = doc(db, 'workspaces', wsId);

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
      const displayName = (user.displayName || user.email?.split('@')[0] || 'کاربر').slice(0, 120);

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
            ownerId: user.uid,
            lastUpdatedByUid: user.uid,
            lastUpdatedByName: displayName,
            payloadJson: serialized,
            syncRevision: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          updateStatus({
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
            lastUpdatedByUid: user.uid,
            lastUpdatedByName: displayName,
            payloadJson: serialized,
            syncRevision: nextRev,
            updatedAt: serverTimestamp(),
          });
          updateStatus({
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
    const user = auth.currentUser;
    if (!user || !remotePayloadHandler) return false;

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
          errorMessage: 'هنوز اطلاعاتی در این کد فضای کاری ابری ذخیره نشده است.',
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
    if (!currentStatus.isAuthenticated || !currentStatus.autoSyncEnabled) return;
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
