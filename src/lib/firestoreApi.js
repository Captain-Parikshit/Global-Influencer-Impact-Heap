/**
 * Firestore API — per-user heap persistence.
 * Each user's heap is stored under: users/{uid}/heap (a single document).
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const heapDocRef = (uid) => doc(db, 'users', uid, 'data', 'heap');

/**
 * Load saved rankings for a user from Firestore.
 * @param {string} uid
 * @returns {Promise<Array>} array of influencer objects, or []
 */
export const loadHeap = async (uid) => {
  try {
    const snap = await getDoc(heapDocRef(uid));
    if (snap.exists()) {
      return snap.data().rankings ?? [];
    }
    return [];
  } catch (err) {
    console.error('[firestoreApi] loadHeap failed:', err);
    return [];
  }
};

/**
 * Save the current rankings array to Firestore for a user.
 * @param {string} uid
 * @param {Array} rankings
 */
export const saveHeap = async (uid, rankings) => {
  try {
    await setDoc(heapDocRef(uid), { rankings, updatedAt: Date.now() });
  } catch (err) {
    console.error('[firestoreApi] saveHeap failed:', err);
  }
};

/**
 * Clear all heap data for a user from Firestore.
 * @param {string} uid
 */
export const clearHeap = async (uid) => {
  try {
    await deleteDoc(heapDocRef(uid));
  } catch (err) {
    console.error('[firestoreApi] clearHeap failed:', err);
  }
};
