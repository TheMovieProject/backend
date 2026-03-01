"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MdAdd,
  MdArrowBack,
  MdCheck,
  MdClose,
  MdDelete,
  MdLocalMovies,
  MdLock,
  MdPersonAdd,
  MdPublic,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import toast from "react-hot-toast";
import { invalidateWatchlistsCache, loadBaseWatchlists } from "@/lib/watchlists-client";

const isShared = (l) => (l?.visibility || (l?.isPublic ? "SHARED" : "PRIVATE")) === "SHARED";
const isLegacyHidden = (l) => l?.slug === "my-watchlist" && !l?.isSystemDefault;
const isDefault = (l) => Boolean(l?.isSystemDefault) || l?.slug === "all-watchlisted";
const PROJECT_ICON = "/img/logo.png";
const safePoster = (m) =>
  !m?.posterUrl ? PROJECT_ICON : m.posterUrl.startsWith("http") ? m.posterUrl : `https://image.tmdb.org/t/p/w500${m.posterUrl}`;
const collectionPreview = (l) => l?.previewPosterUrl || l?.coverImage || null;
const normalize = (l) => ({
  ...l,
  count: l?.count ?? l?.itemCount ?? l?.items?.length ?? 0,
  visibility: l?.visibility || (l?.isPublic ? "SHARED" : "PRIVATE"),
  isSystemDefault: Boolean(l?.isSystemDefault) || isDefault(l),
});
const userLabel = (u) => u?.name || u?.username || "User";

/**
 * @param {{ user?: { avatarUrl?: string | null; image?: string | null; name?: string | null; username?: string | null }, size?: number, ring?: string }} props
 */
function Avatar({ user, size = 24, ring = "border-white/15" }) {
  const src = user?.avatarUrl || user?.image;
  if (src) {
    return <img src={src} alt={userLabel(user)} width={size} height={size} className={`rounded-full object-cover border ${ring}`} style={{ width: size, height: size }} />;
  }
  const txt = userLabel(user).slice(0, 1).toUpperCase();
  return (
    <div className={`rounded-full border ${ring} bg-white/10 text-white text-[10px] font-semibold flex items-center justify-center`} style={{ width: size, height: size }}>
      {txt}
    </div>
  );
}

/**
 * @param {{ initialWatchlistId?: string | null }} props
 */
export default function WatchListClientRevamp({ initialWatchlistId = null }) {
  const router = useRouter();
  const detailMode = Boolean(initialWatchlistId);

  const [lists, setLists] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState("create");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const defaultList = useMemo(() => lists.find(isDefault) || null, [lists]);
  const collections = useMemo(() => lists.filter((l) => !isDefault(l)), [lists]);
  const currentListId = detailMode ? initialWatchlistId : defaultList?.id || null;
  const active = detail;

  const selectedContacts = useMemo(() => contacts.filter((c) => selectedIds.includes(c.id)), [contacts, selectedIds]);
  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((u) => [u.username, u.name].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [contacts, contactQuery]);

  const loadLists = async (force = false) => {
    try {
      setLoadingLists(true);
      const payload = await loadBaseWatchlists(force);
      setLists((payload?.watchlists || []).filter((l) => !isLegacyHidden(l)).map(normalize));
    } catch (e) {
      toast.error(e.message || "Failed to load watchlists.");
    } finally {
      setLoadingLists(false);
    }
  };

  const loadDetail = async (id) => {
    if (!id) return setDetail(null);
    try {
      setLoadingDetail(true);
      const r = await fetch(`/api/watchlists/${id}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Failed to load watchlist");
      const next = j?.data?.watchlist ? normalize(j.data.watchlist) : null;
      if (next && isLegacyHidden(next)) {
        router.replace("/watchlists");
        setDetail(null);
        return;
      }
      setDetail(next);
      if (next) setLists((prev) => prev.map((l) => (l.id === next.id ? { ...l, ...next, count: next.items?.length ?? l.count } : l)));
    } catch (e) {
      toast.error(e.message || "Failed to load watchlist.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshAll = async () => {
    try {
      setRefreshing(true);
      invalidateWatchlistsCache();
      await loadLists(true);
      if (currentListId) await loadDetail(currentListId);
    } finally {
      setRefreshing(false);
    }
  };

  const ensureContacts = async () => {
    if (contactsLoaded || contactsLoading) return;
    try {
      setContactsLoading(true);
      const r = await fetch("/api/watchlists/contacts", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Failed to load people");
      setContacts(j?.data?.contacts || []);
      setContactsLoaded(true);
    } catch (e) {
      toast.error(e.message || "Failed to load people.");
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWatchlistId]);

  useEffect(() => {
    if (currentListId) void loadDetail(currentListId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId]);

  const openCreate = () => {
    setSheetOpen(true);
    setSheetStep("create");
    void ensureContacts();
  };
  const closeSheet = () => {
    if (creating) return;
    setSheetOpen(false);
    setSheetStep("create");
    setContactQuery("");
  };
  const toggleUser = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const createCollection = async () => {
    const name = newName.trim();
    if (!name) return toast.error("Collection name is required.");
    try {
      setCreating(true);
      const r = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberUserIds: selectedIds }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Failed to create collection");
      const created = j?.data?.watchlist;
      toast.success(selectedIds.length ? `Collection created. ${selectedIds.length} people added.` : "Collection created.");
      setNewName("");
      setSelectedIds([]);
      setSheetOpen(false);
      invalidateWatchlistsCache();
      await loadLists(true);
      if (created?.id) router.push(`/watchlists/${created.id}`);
    } catch (e) {
      toast.error(e.message || "Failed to create collection.");
    } finally {
      setCreating(false);
    }
  };

  const removeItem = async (item) => {
    if (!active?.id) return;
    const movieParam = item?.movie?.tmdbId || item?.movieId;
    if (!movieParam) {
      toast.error("Movie identifier missing.");
      return;
    }
    const previousDetail = detail;
    const previousLists = lists;
    setDetail((d) => (d?.id === active.id ? { ...d, items: (d.items || []).filter((x) => x.id !== item.id) } : d));
    setLists((prevLists) => prevLists.map((l) => (l.id === active.id ? { ...l, count: Math.max(0, (l.count || 0) - 1) } : l)));
    try {
      const r = await fetch(`/api/watchlists/${active.id}/items/${encodeURIComponent(String(movieParam))}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Failed to remove movie");
      toast.success("Removed from watchlist.");
      invalidateWatchlistsCache();
      await loadDetail(active.id);
    } catch (e) {
      setDetail(previousDetail);
      setLists(previousLists);
      toast.error(e.message || "Failed to remove movie.");
    }
  };

  const deleteCollection = async () => {
    if (!active || isDefault(active)) return;
    if (!window.confirm(`Delete "${active.name}"?`)) return;
    try {
      const r = await fetch(`/api/watchlists/${active.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Failed to delete collection");
      toast.success("Collection deleted.");
      invalidateWatchlistsCache();
      router.push("/watchlists");
    } catch (e) {
      toast.error(e.message || "Failed to delete collection.");
    }
  };

  if (loadingLists && lists.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1d27] via-[#7a4a00] to-[#d79a00] px-4 md:px-6 pb-10 pt-28 md:pt-32 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/15 bg-black/25 min-h-[58vh] backdrop-blur-xl flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d27] via-[#7a4a00] to-[#d79a00] px-4 md:px-6 pb-10 pt-28 md:pt-32 text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        {detailMode ? (
          <section className="rounded-3xl border border-white/15 bg-black/25 p-4 md:p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <button type="button" onClick={() => router.push("/watchlists")} className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
                  <MdArrowBack /> Back to watchlist
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold truncate">{active?.name || "Collection"}</h1>
                  {active ? <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs">{isShared(active) ? <MdPublic /> : <MdLock />}{isShared(active) ? "Shared" : "Private"}</span> : null}
                  {active && isDefault(active) ? <span className="rounded-full border border-yellow-300/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200">All Watchlisted</span> : null}
                </div>
                <p className="mt-2 text-sm text-white/70">{active?.items?.length ?? active?.count ?? 0} movies</p>
                {isShared(active) && active?.members?.length ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {active.members.slice(0, 6).map((m) => <Avatar key={m.id} user={m.user} size={28} ring="border-2 border-[#1b160d]" />)}
                    </div>
                    <span className="text-xs text-white/70">{active.members.length} people</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60">
                  <MdRefresh className={refreshing ? "animate-spin" : ""} /> Refresh
                </button>
                {!isDefault(active) && active?.canManage ? (
                  <button type="button" onClick={deleteCollection} className="inline-flex items-center gap-2 rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20">
                    <MdDelete /> Delete
                  </button>
                ) : null}
              </div>
            </div>

            {loadingDetail && !active ? (
              <div className="min-h-[45vh] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>
            ) : !active ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/80">Collection not found or inaccessible.</div>
            ) : active.items?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {active.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/12 bg-[#fbfbfb] p-3 text-black shadow-lg">
                    <Link href={`/movies/${item.movie?.tmdbId}`} className="block">
                      <div className="mb-3 aspect-[3/4] overflow-hidden rounded-xl bg-zinc-200">
                        <Image src={safePoster(item.movie || {})} alt={item.movie?.title || "Movie"} width={240} height={360} className="h-full w-full object-cover" />
                      </div>
                    </Link>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{item.movie?.title || "Untitled movie"}</p>
                        {isShared(active) && item.addedByUser ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                            <Avatar user={item.addedByUser} size={20} ring="border-zinc-300" />
                            <span className="truncate">{item.addedByUser.username ? `@${item.addedByUser.username}` : userLabel(item.addedByUser)}</span>
                          </div>
                        ) : null}
                      </div>
                      {(active.canEdit || active.canManage) ? <button type="button" onClick={() => removeItem(item)} className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"><MdDelete size={14} /></button> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><MdLocalMovies size={26} className="text-white/75" /></div>
                <p className="text-white/85">No movies in this collection yet.</p>
                <Link href="/movies" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90"><MdAdd /> Browse movies</Link>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-white/15 bg-black/25 p-4 md:p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Watchlist</h1>
                  <p className="mt-1 text-sm text-white/70">All Watchlisted and your collections.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={refreshAll} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"><MdRefresh className={refreshing ? "animate-spin" : ""} /> Refresh</button>
                  <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90"><MdAdd /> Add collection</button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/15 bg-black/25 p-4 md:p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Collections</h2>
                  <p className="text-sm text-white/70">Shared collections can include only your followers/following.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <button type="button" onClick={openCreate} className="group rounded-2xl border border-dashed border-white/25 bg-black/15 p-4 text-left hover:border-white/40 hover:bg-black/20 transition">
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/5"><MdAdd size={28} className="text-white/80 group-hover:text-white" /></div>
                  <p className="font-semibold text-white">Add collection</p>
                  <p className="text-xs text-white/60 mt-1">Create a new collection</p>
                </button>
                {collections.map((l) => (
                  <button key={l.id} type="button" onClick={() => router.push(`/watchlists/${l.id}`)} className="group rounded-2xl border border-white/15 bg-black/20 p-3 text-left hover:bg-black/30 hover:border-white/25 transition shadow-lg">
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-zinc-900/60">
                      {collectionPreview(l) ? (
                        <>
                          <Image
                            src={safePoster({ posterUrl: collectionPreview(l) })}
                            alt={`${l.name} collection`}
                            width={320}
                            height={320}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/35 backdrop-blur">
                            <MdLocalMovies size={16} className="text-white/90" />
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-5">
                          <Image
                            src={PROJECT_ICON}
                            alt="TheMovieProject"
                            width={64}
                            height={64}
                            className="h-14 w-14 object-contain opacity-90"
                          />
                        </div>
                      )}
                    </div>
                    <p className="truncate font-semibold text-white">{l.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/70">{l.count || 0} movies</span>
                      {isShared(l) ? <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">Shared</span> : <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/70">Private</span>}
                    </div>
                  </button>
                ))}
              </div>
              {!collections.length ? <p className="mt-4 text-sm text-white/65">No collections yet. Tap Add collection.</p> : null}
            </section>

            <section className="rounded-3xl border border-white/15 bg-black/25 p-4 md:p-6 backdrop-blur-xl shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">{defaultList?.name || "All Watchlisted"}</h2>
                    <span className="rounded-full border border-yellow-300/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200">Default</span>
                  </div>
                  <p className="text-sm text-white/70">{active?.items?.length ?? defaultList?.count ?? 0} movies</p>
                </div>
                {defaultList?.id ? <button type="button" onClick={() => router.push(`/watchlists/${defaultList.id}`)} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Open all</button> : null}
              </div>

              {loadingDetail && !active ? (
                <div className="min-h-[40vh] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>
              ) : active?.items?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {active.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/12 bg-[#fbfbfb] p-3 text-black shadow-lg">
                      <Link href={`/movies/${item.movie?.tmdbId}`} className="block">
                        <div className="mb-3 aspect-[3/4] overflow-hidden rounded-xl bg-zinc-200">
                          <Image src={safePoster(item.movie || {})} alt={item.movie?.title || "Movie"} width={240} height={360} className="h-full w-full object-cover" />
                        </div>
                      </Link>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{item.movie?.title || "Untitled movie"}</p>
                          <p className="mt-2 text-xs text-zinc-500">{item.addedAt ? new Date(item.addedAt).toLocaleDateString() : "Watchlisted"}</p>
                        </div>
                        {(active.canEdit || active.canManage) ? <button type="button" onClick={() => removeItem(item)} className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"><MdDelete size={14} /></button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><MdLocalMovies size={26} className="text-white/75" /></div>
                  <p className="text-white/85">No movies watchlisted yet.</p>
                  <Link href="/movies" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90"><MdAdd /> Explore movies</Link>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm px-3 py-6 sm:px-4 sm:py-8">
          <div className="mx-auto flex min-h-full items-end justify-center sm:items-center">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#111] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
                <button type="button" onClick={() => (sheetStep === "people" ? setSheetStep("create") : closeSheet())} disabled={creating} className="text-sm text-white/80 hover:text-white disabled:opacity-50">
                  {sheetStep === "people" ? "Back" : "Cancel"}
                </button>
                <h3 className="text-lg font-semibold">{sheetStep === "people" ? "Add people" : "New collection"}</h3>
                <button type="button" onClick={() => (sheetStep === "people" ? setSheetStep("create") : createCollection())} disabled={sheetStep === "create" && (creating || !newName.trim())} className="text-sm font-semibold text-white disabled:text-white/40">
                  {sheetStep === "people" ? "Done" : creating ? "Creating..." : "Create"}
                </button>
              </div>

              {sheetStep === "create" ? (
                <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
                    <label className="block text-xs uppercase tracking-wide text-white/50 mb-2">Collection name</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createCollection())} placeholder="Weekend thrillers" autoFocus className="w-full bg-transparent text-base text-white placeholder:text-white/35 outline-none" />
                  </div>
                  <button type="button" onClick={() => { setSheetStep("people"); void ensureContacts(); }} className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"><MdPersonAdd size={20} /></div>
                      <div>
                        <p className="font-medium text-white">Add people to this collection</p>
                        <p className="text-sm text-white/60">{selectedIds.length ? `${selectedIds.length} selected - notification will be sent` : "Only followers or people you follow"}</p>
                      </div>
                    </div>
                    <span className="text-white/60">{">"}</span>
                  </button>
                  {selectedContacts.length ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap gap-2">
                      {selectedContacts.map((u) => <button key={u.id} type="button" onClick={() => toggleUser(u.id)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"><Avatar user={u} size={18} /><span>{u.username ? `@${u.username}` : userLabel(u)}</span><MdClose size={12} className="text-white/60" /></button>)}
                    </div></div>
                  ) : null}
                </div>
              ) : (
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2"><MdSearch className="text-white/50" /><input value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} placeholder="Search followers / following" className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none" /></div>
                  {contactsLoading && !contacts.length ? (
                    <div className="min-h-[260px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>
                  ) : (
                    <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2">
                      {filteredContacts.map((u) => {
                        const selected = selectedIds.includes(u.id);
                        return (
                          <button key={u.id} type="button" onClick={() => toggleUser(u.id)} className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition ${selected ? "border-emerald-300/35 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar user={u} size={38} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{userLabel(u)}</p>
                                <p className="truncate text-xs text-white/60">{u.username ? `@${u.username}` : ""}</p>
                                <div className="mt-1 flex gap-1 text-[10px]">
                                  {u.relation?.following ? <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/70">Following</span> : null}
                                  {u.relation?.follower ? <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/70">Follower</span> : null}
                                </div>
                              </div>
                            </div>
                            <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${selected ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-200" : "border-white/20 text-transparent"}`}><MdCheck size={15} /></div>
                          </button>
                        );
                      })}
                      {!contactsLoading && !filteredContacts.length ? <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/65">{contacts.length ? "No people matched your search." : "No followers/following found yet."}</div> : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
