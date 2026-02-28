import WatchlistClient from "@/app/components/WatchListClient/WatchListClientRevamp";

export default function WatchlistDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <WatchlistClient initialWatchlistId={params.id} />;
}
