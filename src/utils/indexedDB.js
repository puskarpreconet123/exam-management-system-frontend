const DB_NAME = 'ExamDB';
const DB_VERSION = 1;
const STORE_RESPONSES = 'responses';
const STORE_EXAM_DATA = 'examData';

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_RESPONSES)) {
                db.createObjectStore(STORE_RESPONSES, { keyPath: 'attemptId' });
            }
            if (!db.objectStoreNames.contains(STORE_EXAM_DATA)) {
                db.createObjectStore(STORE_EXAM_DATA, { keyPath: 'attemptId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveExamData = async (attemptId, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_EXAM_DATA, 'readwrite');
        const store = transaction.objectStore(STORE_EXAM_DATA);
        const request = store.put({ attemptId, ...data, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getExamData = async (attemptId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_EXAM_DATA, 'readonly');
        const store = transaction.objectStore(STORE_EXAM_DATA);
        const request = store.get(attemptId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveResponses = async (attemptId, answers, flagged) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_RESPONSES, 'readwrite');
        const store = transaction.objectStore(STORE_RESPONSES);
        const request = store.put({
            attemptId,
            answers,
            flaggedArray: Array.from(flagged),
            timestamp: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getResponses = async (attemptId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_RESPONSES, 'readonly');
        const store = transaction.objectStore(STORE_RESPONSES);
        const request = store.get(attemptId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearExamData = async (attemptId) => {
    const db = await initDB();
    const transaction = db.transaction([STORE_RESPONSES, STORE_EXAM_DATA], 'readwrite');
    transaction.objectStore(STORE_RESPONSES).delete(attemptId);
    transaction.objectStore(STORE_EXAM_DATA).delete(attemptId);
};
