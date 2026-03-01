export const dynamic = "force-dynamic";

// SSE was replaced with polling in the client. Returning 204 prevents stale
// cached clients from keeping a long-lived function open on Vercel.
export async function GET() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
