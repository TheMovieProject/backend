import ShakaPlayer from "@/app/components/VideoPlayer/ShakaPlayer"


async function getVideo(id: string) {
const res = await fetch(`${process.env.NEXTAUTH_URL}/api/videos/${id}`, { cache: "no-store" });
return res.json();
}


export default async function WatchPage({ searchParams }: { searchParams: { m?: string }}) {
const id = searchParams.m!;
const v = await getVideo(id);
const more = await fetch(`${process.env.NEXTAUTH_URL}/api/videos`).then(r=>r.json());
return (
<div className="max-w-6xl mx-auto p-6 text-white">
<div className="grid md:grid-cols-3 gap-6">
<div className="md:col-span-2 space-y-4">
<ShakaPlayer playbackId={v.muxPlaybackId} />
<h1 className="text-2xl font-bold">{v.title}</h1>
<p className="opacity-90">{v.description}</p>
</div>
<aside className="space-y-3">
<h3 className="font-semibold">More films</h3>
{more.filter((x:any)=>x.id!==id).slice(0,8).map((x:any)=> (
<a key={x.id} href={`/theatre/watch?m=${x.id}`} className="flex gap-3 items-center">
<img src={x.posterUrl || '/img/placeholder.png'} className="w-16 h-24 object-cover rounded" />
<div className="text-sm">{x.title}</div>
</a>
))}
</aside>
</div>
{/* Comments UI can call /api/videos/[id]/comments */}
</div>
);
}