import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/server-fetch";

export async function GET(req, { params }) {
  try {
    const { movieId } = params;
    const res = await fetchWithTimeout(
      `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${process.env.MOVIEDB_API_KEY}`,
      { timeoutMs: 8000, next: { revalidate: 900 } }
    );

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data.results);
  } catch (error) {
    console.error("GET /api/movies/[movieId]/similar error", error);
    const isTimeout =
      error?.name === "AbortError" ||
      error?.code === "ETIMEDOUT" ||
      (typeof error?.message === "string" && error.message.toLowerCase().includes("timed out"));

    if (isTimeout) {
      return NextResponse.json([], { status: 504 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
 
