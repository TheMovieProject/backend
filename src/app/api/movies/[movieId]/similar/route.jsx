import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { movieId } = params;
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${process.env.MOVIEDB_API_KEY}`
  );
  const data = await res.json();
  return NextResponse.json(data.results);
}
 