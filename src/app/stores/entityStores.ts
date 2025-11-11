// src/app/stores/entityStore.ts
"use client";
import { create } from "zustand";

type EntityType = "review" | "blog";
type EntityKey = `${EntityType}:${string}`;

export type EntitySnapshot = {
  id: string;
  entityType: EntityType;
  likes: number;
  fire: number;
  likedByMe?: boolean;
  firedByMe?: boolean;
  commentsCount?: number; // optional for blogs or when unknown
  // optional extra fields if you want
};

type Store = {
  byId: Record<EntityKey, EntitySnapshot>;
  // write APIs
  upsert: (snap: Partial<EntitySnapshot> & {id:string; entityType:EntityType}) => void;
  optimisticToggle: (
    entityType: EntityType,
    id: string,
    kind: "like" | "fire"
  ) => () => void; // returns rollback
  bumpComments: (entityType: EntityType, id: string, delta: number) => void;
  hydrateFromItem: (item: any) => void; // seed from server items
  clear: () => void;
};

const channel =
  typeof window !== "undefined" ? new BroadcastChannel("entity-updates") : null;

export const useEntityStore = create<Store>((set, get) => ({
  byId: {},

  upsert: (snap) => {
    const key: EntityKey = `${snap.entityType}:${snap.id}`;
    set((s) => {
      const prev = s.byId[key] || { id: snap.id, entityType: snap.entityType, likes: 0, fire: 0 };
      const next = { ...prev, ...snap };
      const byId = { ...s.byId, [key]: next };
      // cross-tab broadcast
      channel?.postMessage({ type: "upsert", payload: next });
      return { byId };
    });
  },

  optimisticToggle: (entityType, id, kind) => {
    const key: EntityKey = `${entityType}:${id}`;
    const field = kind === "like" ? "likes" : "fire";
    const activeField = kind === "like" ? "likedByMe" : "firedByMe";

    // compute optimistic next
    const prev = get().byId[key];
    const curr = prev || { id, entityType, likes: 0, fire: 0, likedByMe: false, firedByMe: false };
    const toggled = !curr[activeField as keyof EntitySnapshot];

    // apply optimistic
    get().upsert({
      id,
      entityType,
      [field]: Math.max(0, (curr as any)[field] + (toggled ? 1 : -1)),
      [activeField]: toggled,
    } as any);

    // rollback function
    return () => {
      // revert to previous
      get().upsert({
        id,
        entityType,
        [field]: curr[field as keyof EntitySnapshot] as number,
        [activeField]: curr[activeField as keyof EntitySnapshot] as boolean,
      } as any);
    };
  },

  bumpComments: (entityType, id, delta) => {
    const key: EntityKey = `${entityType}:${id}`;
    const curr = get().byId[key];
    const now = curr || { id, entityType, likes: 0, fire: 0 };
    get().upsert({
      id,
      entityType,
      commentsCount: Math.max(0, (now.commentsCount ?? 0) + delta),
    });
  },

  hydrateFromItem: (raw) => {
    // works for both review/blog server payloads
    const entityType: EntityType = raw.type === "review" || raw.commentsTree ? "review" : "blog";
    const snap: EntitySnapshot = {
      id: raw.id,
      entityType,
      likes: raw.likes || 0,
      fire: raw.fire || 0,
      likedByMe: !!raw.likedByMe,
      firedByMe: !!raw.firedByMe,
      commentsCount:
        typeof raw.commentsCount === "number"
          ? raw.commentsCount
          : raw.comments?.length ?? raw.reviewComments?.length ?? raw._raw?.commentsCount,
    };
    get().upsert(snap);
  },

  clear: () => set({ byId: {} }),
}));

// cross-tab listener
channel?.addEventListener("message", (ev) => {
  if (ev.data?.type === "upsert") {
    useEntityStore.getState().upsert(ev.data.payload);
  }
});

/** Hook to read a merged snapshot (store wins over initial props) */
export function useEntity(entityType: EntityType, id: string, initial?: Partial<EntitySnapshot>) {
  const key: EntityKey = `${entityType}:${id}`;
  const fromStore = useEntityStore((s) => s.byId[key]);
  return { ...(initial || {}), ...(fromStore || {}) } as EntitySnapshot & Partial<EntitySnapshot>;
}
