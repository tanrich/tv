export interface IHistoryRecord {
    vodId: string;
    vodName: string;
    vodPic: string;
    totalEpisodes: number;
    currentEpisode: number; // 0-based index
    currentTime: number;    // seconds
    duration: number;       // seconds
    progress: number;       // 0-100
    updatedAt: number;      // timestamp ms
}

const DB_NAME = 'tv-history';
const DB_VERSION = 1;
const STORE_NAME = 'records';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'vodId' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };
    });
    return dbPromise;
}

export async function putRecord(record: IHistoryRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getRecord(vodId: string): Promise<IHistoryRecord | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(vodId);
        req.onsuccess = () => resolve(req.result ?? undefined);
        req.onerror = () => reject(req.error);
    });
}

export async function getRecentRecords(limit = 10): Promise<IHistoryRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('updatedAt');
        const req = index.openCursor(null, 'prev');
        const results: IHistoryRecord[] = [];
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor && results.length < limit) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        req.onerror = () => reject(req.error);
    });
}

export async function getAllRecords(): Promise<IHistoryRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('updatedAt');
        const req = index.openCursor(null, 'prev');
        const results: IHistoryRecord[] = [];
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        req.onerror = () => reject(req.error);
    });
}
