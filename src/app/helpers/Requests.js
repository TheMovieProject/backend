const apiKey = '095ba7f7fba6c8e94aa5f385a319cea7';

const requests = {
    requestPopular: `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=1`,
    requestTopRated: `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=en-US&page=1`,
    requestUpcoming: `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`,
    requestNowPlaying: `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`,
    requestTrendingWeek: `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=en-US`,
    
    // New functions for fetching movie details and credits
    getMovieDetails: (movieId) => `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`,
    getMovieCredits: (movieId) => `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}&language=en-US`,
};

export default requests;