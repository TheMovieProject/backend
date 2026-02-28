"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { MdAdd, MdBookmark, MdCheck } from "react-icons/md";
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

function isDefaultWatchlist(list: WatchlistSummary, defaultWatchlistId?: string | null) {
  return Boolean(list.isSystemDefault) || list.slug === "all-watchlisted" || list.id === defaultWatchlistId;
}

function isLegacyMyWatchlist(list: WatchlistSummary) {
  return list.slug === "my-watchlist" && !list.isSystemDefault;
}

function getVisibleWatchlists(watchlists: WatchlistSummary[]) {
  return watchlists.filter((list) => !isLegacyMyWatchlist(list));
}

export default function AddToWatchlistControlRevamp({
  movie,
  compact = false,
  className = "",
  onStatusChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tmdbId = getMovieTmdbId(movie);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUp: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyListIds, setBusyListIds] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [data, setData] = useState<ApiState>({
    watchlists: [],
    defaultWatchlistId: null,
    movieMembership: null,
  });

  const visibleWatchlists = getVisibleWatchlists(data.watchlists);
  const defaultList =
    visibleWatchlists.find((list) => isDefaultWatchlist(list, data.defaultWatchlistId)) || null;
  const collectionLists = visibleWatchlists.filter((list) => list.id !== defaultList?.id);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setPanelOpen(false);
    }
    if (panelOpen) document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen || typeof window === "undefined") return;

    const updatePanelPosition = () => {
      const anchor = rootRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 10;
      const preferredWidth = compact ? 340 : 368;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(preferredWidth, Math.max(280, viewportWidth - viewportPadding * 2));
      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - viewportPadding);
      const spaceAbove = Math.max(0, rect.top - viewportPadding);
      const comfortHeight = compact ? 380 : 430;
      const openUp = spaceBelow < comfortHeight && spaceAbove > spaceBelow;
      const top = openUp ? Math.max(viewportPadding, rect.top - gap) : rect.bottom + gap;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        Math.max(viewportPadding, viewportWidth - width - viewportPadding)
      );
      const availableHeight = openUp ? spaceAbove - gap : spaceBelow - gap;
      const maxHeight = Math.max(240, Math.min(620, availableHeight));

      setPanelPosition({ top, left, width, maxHeight, openUp });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [panelOpen, compact]);

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
        watchlists: getVisibleWatchlists(payload.data.watchlists || []),
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
    void loadLists();
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
      showToast("You can view this collection, but only members can edit it", 1800);
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
      showToast("Could not find watchlist", 1500);
      return;
    }

    const inDefault = Boolean(data.movieMembership?.inDefault);
    await toggleListMembership(defaultId, !inDefault);
  };

  const createListAndSave = async () => {
    const name = newListName.trim();
    if (!name) {
      showToast("Collection name is required", 1400);
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
        throw new Error(createPayload?.error?.message || "Failed to create collection");
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
        throw new Error(savePayload?.error?.message || "Failed to save movie to collection");
      }

      await loadLists();
      showToast(`Saved to ${created.name}`);
    } catch (error: any) {
      showToast(error?.message || "Failed to create collection", 1600);
    } finally {
      setCreating(false);
    }
  };

  const inDefault = Boolean(data.movieMembership?.inDefault);

  const stopLinkNavigation = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openPanel = async () => {
    setPanelOpen(true);
    await loadLists();
  };

  const handlePrimaryButtonClick = async (e: ReactMouseEvent) => {
    stopLinkNavigation(e);

    if (compact) {
      if (panelOpen) {
        setPanelOpen(false);
        return;
      }
      await openPanel();
      return;
    }

    if (panelOpen) {
      setPanelOpen(false);
      return;
    }

    if (!inDefault) {
      await quickToggleDefault();
    }

    await openPanel();
  };

  const renderListRow = (list: WatchlistSummary, opts?: { forceAllLabel?: boolean }) => {
    const selected = membershipHas(list.id);
    const pending = !!busyListIds[list.id];
    const editable = canEditList(list);
    const showAllChip = opts?.forceAllLabel || isDefaultWatchlist(list, data.defaultWatchlistId);

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
        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
          selected
            ? "border-blue-400/55 bg-blue-500/14 text-white"
            : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
        } ${!editable ? "cursor-not-allowed opacity-60" : ""}`}
        title={editable ? undefined : "You can view this collection but cannot edit it"}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {showAllChip ? "All Watchlisted" : list.name}
              </span>
              {showAllChip ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                  All
                </span>
              ) : null}
              {!showAllChip && list.visibility === "SHARED" ? (
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                  Shared
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-white/55">
              {list.itemCount} {list.itemCount === 1 ? "movie" : "movies"}
            </p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center">
            {pending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : selected ? (
              <MdCheck className="text-blue-300" />
            ) : (
              <MdAdd className="text-white/65" />
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${compact ? "inline-flex items-center" : "inline-flex items-center gap-2"} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => void handlePrimaryButtonClick(e)}
        disabled={loading || !tmdbId}
        className={
          compact
            ? `rounded-full border border-white/30 p-2 shadow-lg transition-all duration-200 hover:scale-110 ${
                inDefault
                  ? "bg-blue-500 text-white"
                  : "bg-white/95 text-gray-800 hover:bg-blue-500 hover:text-white"
              }`
            : `inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition ${
                inDefault
                  ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                  : "border-gray-300 bg-white/90 text-gray-800 hover:bg-blue-600 hover:text-white"
              }`
        }
        aria-label={
          compact
            ? inDefault
              ? "Manage watchlists and collections"
              : "Save to watchlist and choose collection"
            : inDefault
              ? "Manage watchlists and collections"
              : "Save to watchlist and choose collection"
        }
        title={
          compact
            ? inDefault
              ? "Manage watchlists and collections"
              : "Save to watchlist and choose collection"
            : inDefault
              ? "Manage watchlists and collections"
              : "Save to watchlist and choose collection"
        }
      >
        {inDefault ? <MdCheck size={compact ? 16 : 18} /> : compact ? <MdAdd size={16} /> : <MdBookmark size={18} />}
        {!compact && <span>{inDefault ? "Saved" : "Save"}</span>}
      </button>

      {panelOpen && panelPosition && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[2147483640] flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#171a20] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
            maxHeight: panelPosition.maxHeight,
            transform: panelPosition.openUp ? "translateY(-100%)" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-tight text-white">Save to watchlist</p>
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : null}
          </div>

          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {defaultList ? (
              <div>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Watchlist
                </p>
                {renderListRow(defaultList, { forceAllLabel: true })}
              </div>
            ) : null}

            <div>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Collections
              </p>
              <div className="space-y-1.5">
                {collectionLists.map((list) => renderListRow(list))}
                {!loading && collectionLists.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/65">
                    No collections yet.
                  </div>
                ) : null}
              </div>
            </div>

            {!loading && !defaultList && visibleWatchlists.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/70">
                No watchlist found yet.
              </div>
            ) : null}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-white/45">New collection</p>
            <div className={compact ? "grid grid-cols-1 gap-2" : "flex items-center gap-2"}>
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
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/35"
              />
              <button
                type="button"
                onClick={(e) => {
                  stopLinkNavigation(e);
                  void createListAndSave();
                }}
                disabled={creating}
                className={`inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60 ${
                  compact ? "w-full" : "shrink-0"
                }`}
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
        </div>,
        document.body
      )
        : null}
    </div>
  );
}
