"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  MdAdd,
  MdCheck,
  MdExpandMore,
  MdPlaylistAdd,
  MdBookmark,
} from "react-icons/md";
import { showToast } from "@/app/components/ui/toast";

type MovieInput = {
  id: string | number;
  title?: string;
  original_title?: string;
  poster_path?: string | null;
  posterUrl?: string | null;
};

type WatchlistSummary = {
  id: string;
  name: string;
  slug: string;
  visibility: "PRIVATE" | "SHARED";
  isSystemDefault: boolean;
  itemCount: number;
  myRole?: "OWNER" | "EDITOR" | "VIEWER";
};

type MovieMembership = {
  requestedMovieId: string;
  inAny: boolean;
  inDefault: boolean;
  watchlistIds: string[];
};

type ApiState = {
  watchlists: WatchlistSummary[];
  defaultWatchlistId: string | null;
  movieMembership: MovieMembership | null;
};

type Props = {
  movie: MovieInput;
  compact?: boolean;
  className?: string;
  onStatusChange?: (next: { inDefault: boolean; watchlistIds: string[] }) => void;
};

function getMovieTmdbId(movie: MovieInput) {
  return String(movie?.id ?? "").trim();
}

function getMovieTitle(movie: MovieInput) {
  return String(movie?.title || movie?.original_title || "Untitled movie");
}

function getMoviePoster(movie: MovieInput) {
  if (movie?.poster_path) return `https://image.tmdb.org/t/p/original${movie.poster_path}`;
  if (movie?.posterUrl) return movie.posterUrl;
  return null;
}

function canEditList(list: WatchlistSummary) {
  return list.myRole === "OWNER" || list.myRole === "EDITOR";
}

export default function AddToWatchlistControl({
  movie,
  compact = false,
  className = "",
  onStatusChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tmdbId = getMovieTmdbId(movie);

  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyListIds, setBusyListIds] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [data, setData] = useState<ApiState>({
    watchlists: [],
    defaultWatchlistId: null,
    movieMembership: null,
  });

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setPanelOpen(false);
    }
    if (panelOpen) document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [panelOpen]);

  const emitStatus = (nextData: ApiState) => {
    if (!onStatusChange) return;
    onStatusChange({
      inDefault: Boolean(nextData.movieMembership?.inDefault),
      watchlistIds: nextData.movieMembership?.watchlistIds || [],
    });
  };

  const loadLists = async (): Promise<ApiState | null> => {
    if (!tmdbId) return null;
    setLoading(true);
    try {
      const res = await fetch(`/api/watchlists?movieId=${encodeURIComponent(tmdbId)}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        showToast("Login to save movies", 1500);
        return null;
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Failed to load watchlists");
      }

      const nextData: ApiState = {
        watchlists: payload.data.watchlists || [],
        defaultWatchlistId: payload.data.defaultWatchlistId || null,
        movieMembership: payload.data.movieMembership || null,
      };
      setData(nextData);
      emitStatus(nextData);
      return nextData;
    } catch (error: any) {
      showToast(error?.message || "Failed to load watchlists", 1600);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId]);

  const membershipHas = (watchlistId: string) =>
    Boolean(data.movieMembership?.watchlistIds?.includes(watchlistId));

  const setMembershipState = (updater: (prev: ApiState) => ApiState) => {
    setData((prev) => {
      const next = updater(prev);
      emitStatus(next);
      return next;
    });
  };

  const toggleListMembership = async (watchlistId: string, shouldAdd: boolean) => {
    if (!tmdbId) return;
    const list = data.watchlists.find((x) => x.id === watchlistId);
    if (!list) return;
    if (!canEditList(list)) {
      showToast("You can view this list, but only editors can change it", 1800);
      return;
    }

    setBusyListIds((prev) => ({ ...prev, [watchlistId]: true }));

    const prevSnapshot = data;
    setMembershipState((prev) => {
      const currentIds = new Set(prev.movieMembership?.watchlistIds || []);
      if (shouldAdd) {
        currentIds.add(watchlistId);
        if (prev.defaultWatchlistId) currentIds.add(prev.defaultWatchlistId);
      } else {
        currentIds.delete(watchlistId);
      }
      const nextIds = [...currentIds];
      return {
        ...prev,
        movieMembership: {
          requestedMovieId: tmdbId,
          inAny: nextIds.length > 0,
          inDefault: prev.defaultWatchlistId ? nextIds.includes(prev.defaultWatchlistId) : false,
          watchlistIds: nextIds,
        },
      };
    });

    try {
      if (shouldAdd) {
        const res = await fetch(`/api/watchlists/${watchlistId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movieId: tmdbId,
            title: getMovieTitle(movie),
            posterUrl: getMoviePoster(movie),
          }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.error?.message || "Failed to save movie");
        }
      } else {
        const res = await fetch(
          `/api/watchlists/${watchlistId}/items/${encodeURIComponent(tmdbId)}`,
          { method: "DELETE" }
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.error?.message || "Failed to remove movie");
        }
      }

      showToast(shouldAdd ? `Saved to ${list.name}` : `Removed from ${list.name}`);
    } catch (error: any) {
      setData(prevSnapshot);
      emitStatus(prevSnapshot);
      showToast(error?.message || "Watchlist action failed", 1600);
    } finally {
      setBusyListIds((prev) => {
        const next = { ...prev };
        delete next[watchlistId];
        return next;
      });
    }
  };

  const quickToggleDefault = async () => {
    let defaultId = data.defaultWatchlistId;
    if (!defaultId) {
      const loaded = await loadLists();
      defaultId = loaded?.defaultWatchlistId || null;
    }
    if (!defaultId) {
      showToast("Could not find default watchlist", 1500);
      return;
    }

    const inDefault = Boolean(data.movieMembership?.inDefault);
    await toggleListMembership(defaultId, !inDefault);
  };

  const createListAndSave = async () => {
    const name = newListName.trim();
    if (!name) {
      showToast("List name is required", 1400);
      return;
    }

    setCreating(true);
    try {
      const createRes = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, visibility: "PRIVATE" }),
      });
      const createPayload = await createRes.json().catch(() => null);
      if (!createRes.ok || !createPayload?.ok) {
        throw new Error(createPayload?.error?.message || "Failed to create watchlist");
      }

      const created = createPayload.data.watchlist as WatchlistSummary;
      setNewListName("");

      const saveRes = await fetch(`/api/watchlists/${created.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: tmdbId,
          title: getMovieTitle(movie),
          posterUrl: getMoviePoster(movie),
        }),
      });
      const savePayload = await saveRes.json().catch(() => null);
      if (!saveRes.ok || !savePayload?.ok) {
        throw new Error(savePayload?.error?.message || "Failed to save movie to new list");
      }

      await loadLists();
      showToast(`Saved to ${created.name}`);
    } catch (error: any) {
      showToast(error?.message || "Failed to create list", 1600);
    } finally {
      setCreating(false);
    }
  };

  const inDefault = Boolean(data.movieMembership?.inDefault);

  const stopLinkNavigation = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${compact ? "inline-flex items-center gap-1" : "inline-flex items-center gap-2"} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          stopLinkNavigation(e);
          void quickToggleDefault();
        }}
        disabled={loading || !tmdbId}
        className={
          compact
            ? `p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 border border-white/30 ${
                inDefault ? "bg-blue-500 text-white" : "bg-white/95 text-gray-800 hover:bg-blue-500 hover:text-white"
              }`
            : `inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition ${
                inDefault
                  ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                  : "bg-white/90 text-gray-800 border-gray-300 hover:bg-blue-600 hover:text-white"
              }`
        }
        aria-label={inDefault ? "Remove from All Watchlisted" : "Save to All Watchlisted"}
        title={inDefault ? "Remove from All Watchlisted" : "Save to All Watchlisted"}
      >
        {inDefault ? <MdCheck size={compact ? 16 : 18} /> : <MdBookmark size={compact ? 16 : 18} />}
        {!compact && <span>{inDefault ? "Saved" : "Save"}</span>}
      </button>

      <button
        type="button"
        onClick={(e) => {
          stopLinkNavigation(e);
          const nextOpen = !panelOpen;
          setPanelOpen(nextOpen);
          if (nextOpen) void loadLists();
        }}
        className={
          compact
            ? "p-2 rounded-full shadow-lg border border-white/30 bg-white/95 text-gray-800 hover:bg-white"
            : "inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/30 text-white px-3 py-2 text-sm hover:bg-black/40"
        }
        aria-label="Choose watchlist"
        title="Choose watchlist"
      >
        {compact ? <MdPlaylistAdd size={16} /> : <><MdAdd size={16} /><span>Choose List</span><MdExpandMore size={16} /></>}
      </button>

      {panelOpen && (
        <div
          className={`absolute z-50 ${compact ? "top-12 right-0 w-72" : "top-14 right-0 w-80"} rounded-2xl border border-white/20 bg-[#121212]/95 backdrop-blur-xl shadow-2xl p-3`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Save to watchlist</p>
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {data.watchlists.map((list) => {
              const selected = membershipHas(list.id);
              const pending = !!busyListIds[list.id];
              const editable = canEditList(list);

              return (
                <button
                  type="button"
                  key={list.id}
                  onClick={(e) => {
                    stopLinkNavigation(e);
                    if (pending) return;
                    void toggleListMembership(list.id, !selected);
                  }}
                  disabled={pending || !editable}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                    selected
                      ? "border-blue-400/60 bg-blue-500/15 text-white"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  } ${!editable ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={editable ? undefined : "Viewer access: cannot edit this watchlist"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{list.name}</span>
                        {list.isSystemDefault && (
                          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/80">
                            All
                          </span>
                        )}
                        {list.visibility === "SHARED" && (
                          <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                            Shared
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/60">
                        {list.itemCount} items Â· {list.myRole || "VIEWER"}
                      </div>
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center">
                      {pending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      ) : selected ? (
                        <MdCheck className="text-blue-300" />
                      ) : (
                        <MdAdd className="text-white/70" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && data.watchlists.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70">
                No watchlists yet.
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Create New List</p>
            <div className="flex items-center gap-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createListAndSave();
                  }
                }}
                placeholder="Sci-fi weekend"
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/35"
              />
              <button
                type="button"
                onClick={(e) => {
                  stopLinkNavigation(e);
                  void createListAndSave();
                }}
                disabled={creating}
                className="inline-flex items-center gap-1 rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-60"
              >
                {creating ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : (
                  <MdAdd />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

