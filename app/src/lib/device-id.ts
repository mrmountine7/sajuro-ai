// 기기 고유 ID — localStorage 기반, IndexedDB 이중 백업
const DEVICE_ID_KEY = 'saju_device_id'
const DB_NAME = 'SajuroDeviceDB'
const STORE_NAME = 'device'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

async function saveToIndexedDB(id: string): Promise<void> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onerror = () => resolve()
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME))
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
      req.onsuccess = e => {
        const db = (e.target as IDBOpenDBRequest).result
        try {
          const tx = db.transaction([STORE_NAME], 'readwrite')
          tx.objectStore(STORE_NAME).put({ key: 'device_id', value: id })
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch { resolve() }
      }
    } catch { resolve() }
  })
}

async function getFromIndexedDB(): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onerror = () => resolve(null)
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME))
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
      req.onsuccess = e => {
        const db = (e.target as IDBOpenDBRequest).result
        try {
          const tx = db.transaction([STORE_NAME], 'readonly')
          const get = tx.objectStore(STORE_NAME).get('device_id')
          get.onsuccess = () => resolve(get.result?.value ?? null)
          get.onerror = () => resolve(null)
        } catch { resolve(null) }
      }
    } catch { resolve(null) }
  })
}

let cached: string | null = null

/** 앱 시작 시 한 번 호출하여 IndexedDB에서 복구 */
export async function initDeviceId(): Promise<string> {
  if (cached) return cached
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = await getFromIndexedDB()
    if (id) localStorage.setItem(DEVICE_ID_KEY, id)
  }
  if (!id) {
    id = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    await saveToIndexedDB(id)
  }
  cached = id
  return id
}

/** 동기 버전 — initDeviceId() 이후 또는 localStorage 존재 시 사용 */
export function getDeviceId(): string {
  if (cached) return cached
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    saveToIndexedDB(id)
  }
  cached = id
  return id
}
