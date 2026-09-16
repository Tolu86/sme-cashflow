import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type DocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export function snapToModel<T>(snap: DocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T;
}

export function collectionRef(businessId: string, sub: string) {
  return collection(db!, "businesses", businessId, sub);
}

export function docRef(businessId: string, sub: string, id: string) {
  return doc(db!, "businesses", businessId, sub, id);
}

export async function listAll<T>(businessId: string, sub: string): Promise<T[]> {
  const q = query(collectionRef(businessId, sub), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => snapToModel<T>(d));
}

export async function listSortedDesc<T>(businessId: string, sub: string): Promise<T[]> {
  const q = query(collectionRef(businessId, sub), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => snapToModel<T>(d));
}

export async function getOne<T>(businessId: string, sub: string, id: string): Promise<T | null> {
  const ref = docRef(businessId, sub, id);
  const snap = await getDoc(ref);
  return snap.exists() ? snapToModel<T>(snap) : null;
}

export async function createOne<T extends object>(businessId: string, sub: string, data: T) {
  const ref = doc(collectionRef(businessId, sub));
  await setDoc(ref, data);
  return ref.id;
}

export async function addWithId<T extends object>(businessId: string, sub: string, id: string, data: T) {
  const ref = docRef(businessId, sub, id);
  await setDoc(ref, data);
}

export async function updateOne(businessId: string, sub: string, id: string, data: Partial<unknown>) {
  const ref = docRef(businessId, sub, id);
  await updateDoc(ref, data);
}

export async function removeOne(businessId: string, sub: string, id: string) {
  const ref = docRef(businessId, sub, id);
  await deleteDoc(ref);
}

