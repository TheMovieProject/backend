import { getSeasonalTerm } from "./Seasonal";

const apiKey = "095ba7f7fba6c8e94aa5f385a319cea7";
const BASE = "https://api.themoviedb.org/3";

const requests = {
  requestPopular: `${BASE}/movie/popular?api_key=${apiKey}&language=en-US&page=1`,
  requestTopRated: `${BASE}/movie/top_rated?api_key=${apiKey}&language=en-US&page=1`,
  requestUpcoming: `${BASE}/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`,
  requestNowPlaying: `${BASE}/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`,
  requestTrendingWeek: `${BASE}/trending/movie/week?api_key=${apiKey}`,
  requestHighestGrossing: `${BASE}/discover/movie?api_key=${apiKey}&sort_by=revenue.desc&vote_count.gte=1000&page=1`,
  requestAwardWinners: `${BASE}/discover/movie?api_key=${apiKey}&with_keywords=818&sort_by=vote_average.desc&vote_count.gte=500&page=1`,

  
  requestSeason: (page = 1) => {
    const term = getSeasonalTerm();
    return `${BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(term)}&page=${page}`;
  },

  movieVideos: (id) => `${BASE}/movie/${id}/videos?api_key=${apiKey}&language=en-US`,
  getMovieDetails: (movieId) => `${BASE}/movie/${movieId}?api_key=${apiKey}&language=en-US`,
  getMovieCredits: (movieId) => `${BASE}/movie/${movieId}/credits?api_key=${apiKey}&language=en-US`,
};

export default requests;
