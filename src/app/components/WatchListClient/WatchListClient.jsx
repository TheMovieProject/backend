"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MdDelete,
  MdPlayArrow,
  MdAdd,
  MdPublic,
  MdLock,
  MdPersonAdd,
  MdGroup,
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdFileDownload,
  MdPictureAsPdf,
  MdLocalMovies,
} from "react-icons/md";
import toast from "react-hot-toast";
const PROJECT_ICON = "/img/logo.png";

function safePoster(movie) {
  if (!movie?.posterUrl) return PROJECT_ICON;
  if (movie.posterUrl.startsWith("http")) return movie.posterUrl;
  return `https://image.tmdb.org/t/p/w500${movie.posterUrl}`;
}

function isShared(list) {
  const visibility = list?.visibility || (list?.isPublic ? "SHARED" : "PRIVATE");
  return visibility === "SHARED";
}

function isDefaultList(list) {
  return Boolean(list?.isSystemDefault) || list?.slug === "all-watchlisted" || list?.slug === "my-watchlist";
}

function normalizeSummary(list) {
  return {
    ...list,
    count: list?.count ?? list?.itemCount ?? list?.items?.length ?? 0,
    isPublic: typeof list?.isPublic === "boolean" ? list.isPublic : isShared(list),
    visibility: list?.visibility || (list?.isPublic ? "SHARED" : "PRIVATE"),
    isSystemDefault: Boolean(list?.isSystemDefault) || isDefaultList(list),
  };
}

export default function WatchlistClient({ initialWatchlistId = null }) {
  const [collections, setCollections] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState("PRIVATE");
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeListDetail, setActiveListDetail] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviteLink, setInviteLink] = useState("");

  const activeSummary = useMemo(
    () => collections.find((list) => list.id === activeId) || collections[0] || null,
    [collections, activeId]
  );

  const activeList = useMemo(
    () =>
      activeListDetail && activeListDetail.id === activeId
        ? activeListDetail
        : activeSummary || null,
    [activeListDetail, activeId, activeSummary]
  );

  const loadActiveListDetail = async (listId) => {
    if (!listId) {
      setActiveListDetail(null);
      return;
    }

    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/watchlists/${listId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to fetch watchlist details");
      }
      const detail = payload?.data?.watchlist ? normalizeSummary(payload.data.watchlist) : null;
      setActiveListDetail(detail);
      if (detail) {
        setCollections((prev) =>
          prev.map((list) =>
            list.id === detail.id
              ? { ...list, ...normalizeSummary(detail), count: detail.items?.length ?? list.count }
              : list
          )
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to load watchlist details.");
      setActiveListDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/watchlists", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to fetch watchlists");
      }
      const fetched = (payload?.data?.watchlists || []).map(normalizeSummary);
      setCollections(fetched);
      setActiveId((prev) => {
        if (prev && fetched.some((x) => x.id === prev)) return prev;
        if (initialWatchlistId && fetched.some((x) => x.id === initialWatchlistId)) return initialWatchlistId;
        return fetched[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load watchlists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [initialWatchlistId]);

  useEffect(() => {
    if (!activeId) {
      setActiveListDetail(null);
      return;
    }
    loadActiveListDetail(activeId);
  }, [activeId]);

  const createList = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("List name is required.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, visibility: newVisibility }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to create list");
      }
      setNewName("");
      setInviteLink("");
      toast.success("List created.");
      await loadCollections();
      setActiveId(payload?.data?.watchlist?.id || null);
    } catch (error) {
      toast.error(error.message || "Failed to create list.");
    } finally {
      setCreating(false);
    }
  };

  const removeFromActiveList = async (item) => {
    if (!activeList) return;

    const movieParam = item?.movie?.tmdbId || item?.movieId;
    const previousDetail = activeListDetail;
    try {
      if (previousDetail?.id === activeList.id) {
        const nextItems = (previousDetail.items || []).filter((x) => x.id !== item.id);
        setActiveListDetail({ ...previousDetail, items: nextItems });
      }

      setCollections((prev) =>
        prev.map((list) =>
          list.id === activeList.id
            ? {
                ...list,
                count: Math.max(0, (list.count || 0) - 1),
              }
            : list
        )
      );

      const res = await fetch(
        `/api/watchlists/${activeList.id}/items/${encodeURIComponent(String(movieParam))}`,
        { method: "DELETE" }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to remove movie");
      }
      toast.success("Removed from list.");
      if (activeList.id) await loadActiveListDetail(activeList.id);
    } catch (error) {
      if (previousDetail) setActiveListDetail(previousDetail);
      console.error(error);
      toast.error("Failed to remove movie.");
    }
  };

  const deleteList = async (listId) => {
    const list = collections.find((x) => x.id === listId);
    if (!list) return;
    if (isDefaultList(list)) {
      toast.error("Default watchlist cannot be deleted.");
      return;
    }

    try {
      const res = await fetch(`/api/watchlists/${listId}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to delete list");
      }
      toast.success("List deleted.");
      if (activeId === listId) setActiveListDetail(null);
      await loadCollections();
    } catch (error) {
      toast.error(error.message || "Failed to delete list.");
    }
  };

  const toggleVisibility = async () => {
    if (!activeList) return;
    const nextVisibility = isShared(activeList) ? "PRIVATE" : "SHARED";
    try {
      setSavingVisibility(true);
      const res = await fetch(`/api/watchlists/${activeList.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVisibility }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to update visibility");
      }
      const updated = normalizeSummary(payload?.data?.watchlist || {});

      setCollections((prev) =>
        prev.map((list) =>
          list.id === activeList.id
            ? { ...list, visibility: updated.visibility, isPublic: isShared(updated) }
            : list
        )
      );
      setActiveListDetail((prev) =>
        prev && prev.id === activeList.id
          ? { ...prev, visibility: updated.visibility, isPublic: isShared(updated) }
          : prev
      );
      toast.success(nextVisibility === "SHARED" ? "List is now shared." : "List is now private.");
    } catch (error) {
      toast.error(error.message || "Failed to update list.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const openInviteModal = () => {
    if (!activeList) return;
    setInviteOpen(true);
  };

  const submitInvite = async () => {
    if (!activeList) return;
    try {
      setInviting(true);
      const res = await fetch(`/api/watchlists/${activeList.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim() || undefined,
          userId: inviteUserId.trim() || undefined,
          role: inviteRole,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to create invite");
      }
      const link = payload?.data?.invite?.acceptUrl || "";
      setInviteLink(link);
      if (link) await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(link ? "Invite link copied." : "Invite created.");
      if (activeList.id) await loadActiveListDetail(activeList.id);
    } catch (error) {
      toast.error(error.message || "Could not create invite.");
    } finally {
      setInviting(false);
    }
  };

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await loadCollections();
      if (activeId) await loadActiveListDetail(activeId);
    } finally {
      setRefreshing(false);
    }
  };

  const moveItem = async (index, direction) => {
    if (!activeListDetail?.items?.length || reordering) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeListDetail.items.length) return;

    const items = [...activeListDetail.items];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    const previous = activeListDetail;
    setActiveListDetail({ ...activeListDetail, items });

    try {
      setReordering(true);
      const res = await fetch(`/api/watchlists/${activeListDetail.id}/items/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedMovieIds: items.map((entry) => entry.movieId),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || "Failed to reorder items");
      }
    } catch (error) {
      setActiveListDetail(previous);
      toast.error(error.message || "Failed to reorder items.");
    } finally {
      setReordering(false);
    }
  };

  const exportCsv = () => {
    if (!activeList?.items?.length) {
      toast.error("No movies to export.");
      return;
    }

    const rows = [
      ["List Name", "Movie Title", "TMDB ID", "Added At"],
      ...activeList.items.map((entry) => [
        activeList.name,
        entry?.movie?.title || "",
        entry?.movie?.tmdbId || "",
        entry?.addedAt ? new Date(entry.addedAt).toISOString() : "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((col) => `"${String(col ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeList.name.replace(/\s+/g, "_").toLowerCase()}_watchlist.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  const exportPdf = () => {
    if (!activeList?.items?.length) {
      toast.error("No movies to export.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Pop-up blocked. Allow pop-ups and retry.");
      return;
    }

    const htmlRows = activeList.items
      .map(
        (entry, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${entry?.movie?.title || ""}</td>
            <td>${entry?.movie?.tmdbId || ""}</td>
            <td>${entry?.addedAt ? new Date(entry.addedAt).toLocaleDateString() : ""}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeList.name} - Watchlist</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { margin: 0 0 8px; }
          p { margin: 0 0 16px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${activeList.name}</h1>
        <p>Total movies: ${activeList.items.length}</p>
        <table>
          <thead>
            <tr><th>#</th><th>Movie</th><th>TMDB</th><th>Added</th></tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success("Print dialog opened for PDF export.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 px-4 md:px-6 pb-8 pt-28 md:pt-32 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl">
            <div role="status" aria-live="polite">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <span className="sr-only">Loading your lists</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 px-4 md:px-6 pb-8 pt-28 md:pt-32 font-sans text-white">
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm px-4 py-8">
          <div className="mx-auto max-w-lg rounded-2xl border border-white/15 bg-[#111]/95 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold">Invite Member</h3>
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-white/15 px-3 py-1 text-sm hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-white/70">
                Invite by email or user ID. Editors can add/remove/reorder. Viewers can only view.
              </p>

              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-white/40"
              />
              <input
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="Or paste user ID"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-white/40"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-white/40"
              >
                <option value="VIEWER" className="text-black">Viewer</option>
                <option value="EDITOR" className="text-black">Editor</option>
              </select>

              <div className="flex justify-end">
                <button
                  onClick={submitInvite}
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-60"
                >
                  {inviting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <MdPersonAdd />
                  )}
                  Create Invite
                </button>
              </div>

              {inviteLink ? (
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-200/90 mb-1">Latest Invite Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/90"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteLink);
                        toast.success("Invite link copied");
                      }}
                      className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-5 md:gap-6">
        <aside className="lg:col-span-1 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 h-fit shadow-2xl lg:sticky lg:top-28">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">Your Lists</h1>
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 p-2 hover:bg-white/10 disabled:opacity-60"
              title="Refresh"
            >
              <MdRefresh className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {collections.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveId(list.id)}
                className={`w-full text-left rounded-xl px-3 py-2 border transition ${
                  activeId === list.id
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/35"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{list.name}</span>
                      {isDefaultList(list) && (
                        <span className={`text-[10px] rounded-full px-2 py-0.5 border ${activeId === list.id ? "border-black/20 bg-black/10" : "border-white/20 bg-white/10"}`}>
                          All
                        </span>
                      )}
                      {isShared(list) && (
                        <span className={`text-[10px] rounded-full px-2 py-0.5 border ${activeId === list.id ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-700" : "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"}`}>
                          Shared
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${activeId === list.id ? "text-black/70" : "text-white/70"}`}>
                      {list.myRole || "OWNER"}
                    </div>
                  </div>
                  <span className="text-xs">{list.count ?? list.items?.length ?? 0}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2 border-t border-white/20 pt-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm placeholder:text-white/60 outline-none focus:border-white"
            />
            <select
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value)}
              className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white"
            >
              <option value="PRIVATE" className="text-black">Private</option>
              <option value="SHARED" className="text-black">Shared</option>
            </select>
            <button
              onClick={createList}
              disabled={creating}
              className="w-full rounded-lg bg-white text-black py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {creating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
              ) : (
                <MdAdd size={16} />
              )}
              {creating ? "Creating list" : "Create list"}
            </button>
          </div>
        </aside>

        <section className="lg:col-span-3 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 shadow-2xl min-h-[60vh]">
          {loadingDetail && activeId ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Loading watchlist details...
            </div>
          ) : null}
          {!activeList ? (
            <div className="text-center py-20">
              <p className="text-white/80">Create your first list to start curating movies.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold">{activeList.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs">
                      {isShared(activeList) ? <MdPublic /> : <MdLock />}
                      {isShared(activeList) ? "Shared" : "Private"}
                    </span>
                    {isDefaultList(activeList) && (
                      <span className="rounded-full border border-yellow-300/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200">
                        Default All Watchlisted
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm">
                    {activeList.count ?? activeList.items?.length ?? 0} movies
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    {activeList.members?.length ? `${activeList.members.length} members` : "No members loaded"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleVisibility}
                    disabled={savingVisibility || !activeList.canManage}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {isShared(activeList) ? <MdPublic /> : <MdLock />}
                    {isShared(activeList) ? "Shared" : "Private"}
                  </button>

                  <button
                    onClick={openInviteModal}
                    disabled={!activeList.canManage}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 inline-flex items-center gap-2"
                  >
                    <MdPersonAdd />
                    Invite
                  </button>

                  <button
                    onClick={exportCsv}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 inline-flex items-center gap-2"
                    title="Export this list as CSV"
                  >
                    <MdFileDownload />
                    CSV
                  </button>

                  <button
                    onClick={exportPdf}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 inline-flex items-center gap-2"
                    title="Print this list to PDF"
                  >
                    <MdPictureAsPdf />
                    PDF
                  </button>

                  {!isDefaultList(activeList) && (
                    <button
                      onClick={() => deleteList(activeList.id)}
                      disabled={!activeList.canManage}
                      className="rounded-lg border border-red-300/50 bg-red-500/20 px-3 py-2 text-sm font-semibold hover:bg-red-500/30 inline-flex items-center gap-2"
                    >
                      <MdDelete />
                      Delete list
                    </button>
                  )}
                </div>
              </div>

              {activeList.items?.length > 0 ? (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {activeList.items.map((item) => (
                    <div key={item.id} className="group relative">
                      <div className="rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-1 p-3 border border-gray-200">
                        <Link href={`/movies/${item.movie.tmdbId}`}>
                          <div className="aspect-[3/4] overflow-hidden mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 relative">
                            <Image
                              src={safePoster(item.movie)}
                              alt={item.movie.title || "Movie"}
                              width={200}
                              height={300}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </Link>
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.4rem]">
                          {item.movie.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-1 truncate">
                          {item.addedByUser?.username ? `@${item.addedByUser.username}` : "list item"}
                        </p>
                      </div>

                      {(activeList.canEdit || activeList.canManage) && (
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveItem(activeList.items.findIndex((x) => x.id === item.id), -1)}
                            disabled={reordering || activeList.items.findIndex((x) => x.id === item.id) === 0}
                            className="rounded-full bg-black/80 text-white p-2 hover:bg-black disabled:opacity-40"
                            title="Move earlier"
                          >
                            <MdArrowBack size={14} />
                          </button>
                          <button
                            onClick={() => moveItem(activeList.items.findIndex((x) => x.id === item.id), 1)}
                            disabled={reordering || activeList.items.findIndex((x) => x.id === item.id) === activeList.items.length - 1}
                            className="rounded-full bg-black/80 text-white p-2 hover:bg-black disabled:opacity-40"
                            title="Move later"
                          >
                            <MdArrowForward size={14} />
                          </button>
                          <button
                            onClick={() => removeFromActiveList(item)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg disabled:opacity-50"
                            title="Remove from this list"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MdGroup />
                      <h3 className="font-semibold">Members</h3>
                    </div>
                    <div className="space-y-2">
                      {(activeList.members || []).map((member) => (
                        <div key={member.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.user?.name || member.user?.username || member.user?.email || "User"}
                              </p>
                              <p className="text-xs text-white/60 truncate">
                                {member.user?.username ? `@${member.user.username}` : member.user?.email || member.userId}
                              </p>
                            </div>
                            <span className="text-xs rounded-full border border-white/15 bg-white/5 px-2 py-1">
                              {member.role}
                            </span>
                          </div>
                        </div>
                      ))}
                      {!activeList.members?.length && (
                        <p className="text-sm text-white/60">No members yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold mb-3">Pending Invites</h3>
                    <div className="space-y-2">
                      {(activeList.pendingInvites || []).map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-sm truncate">
                            {invite.email || invite.invitedUser?.email || invite.invitedUserId}
                          </p>
                          <p className="text-xs text-white/60">
                            {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                      {!activeList.pendingInvites?.length && (
                        <p className="text-sm text-white/60">No pending invites.</p>
                      )}
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="text-center py-8">
                    <div className="inline-block bg-white/10 border border-white/20 rounded-2xl p-6">
                      <div className="flex justify-center text-4xl mb-3 text-white">
                        <MdLocalMovies />
                      </div>
                      <p className="text-white/80 mb-4">No movies in this list yet.</p>
                      <Link
                        href="/movies"
                        className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 font-semibold hover:bg-white/90"
                      >
                        <MdPlayArrow size={18} />
                        Explore Movies
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MdGroup />
                        <h3 className="font-semibold">Members</h3>
                      </div>
                      <div className="space-y-2">
                        {(activeList.members || []).map((member) => (
                          <div key={member.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {member.user?.name || member.user?.username || member.user?.email || "User"}
                                </p>
                                <p className="text-xs text-white/60 truncate">
                                  {member.user?.username ? `@${member.user.username}` : member.user?.email || member.userId}
                                </p>
                              </div>
                              <span className="text-xs rounded-full border border-white/15 bg-white/5 px-2 py-1">
                                {member.role}
                              </span>
                            </div>
                          </div>
                        ))}
                        {!activeList.members?.length && (
                          <p className="text-sm text-white/60">No members yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <h3 className="font-semibold mb-3">Pending Invites</h3>
                      <div className="space-y-2">
                        {(activeList.pendingInvites || []).map((invite) => (
                          <div key={invite.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                            <p className="text-sm truncate">
                              {invite.email || invite.invitedUser?.email || invite.invitedUserId}
                            </p>
                            <p className="text-xs text-white/60">
                              {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                        {!activeList.pendingInvites?.length && (
                          <p className="text-sm text-white/60">No pending invites.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}



