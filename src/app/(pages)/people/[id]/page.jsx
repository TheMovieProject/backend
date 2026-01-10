'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  FaBirthdayCake, 
  FaMapMarkerAlt, 
  FaFilm, 
  FaStar, 
  FaExternalLinkAlt,
  FaArrowLeft,
  FaGenderless,
  FaMale,
  FaFemale,
  FaHeart,
  FaCalendarAlt,
  FaClock
} from 'react-icons/fa';
import { SiImdb } from 'react-icons/si';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

// TMDB configuration
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const PersonPage = () => {
  const params = useParams();
  const router = useRouter();
  const [person, setPerson] = useState(null);
  const [movieCredits, setMovieCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [showFullBio, setShowFullBio] = useState(false);

  // Fetch person details
  useEffect(() => {
    const fetchPersonData = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch person details
        const personRes = await fetch(
          `${TMDB_BASE_URL}/person/${params.id}?api_key=${TMDB_API_KEY}&append_to_response=images,external_ids,movie_credits`
        );
        
        if (!personRes.ok) throw new Error('Failed to fetch person data');
        const personData = await personRes.json();

        setPerson(personData);
        
        // Use movie_credits from the appended response
        if (personData.movie_credits) {
          setMovieCredits(personData.movie_credits);
        }
        
        // Process and set images
        const allImages = [
          ...(personData.images?.profiles || []),
        ].sort((a, b) => b.vote_average - a.vote_average);
        
        setImages(allImages);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching person data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [params.id]);

  // Helper functions
  const getGenderIcon = (gender) => {
    switch(gender) {
      case 1: return <FaFemale className="text-yellow-800" title="Female" />;
      case 2: return <FaMale className="text-yellow-800" title="Male" />;
      default: return <FaGenderless className="text-yellow-800/70" title="Not specified" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const calculateAge = (birthdate, deathdate) => {
    if (!birthdate) return null;
    
    const birth = new Date(birthdate);
    const end = deathdate ? new Date(deathdate) : new Date();
    
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getYearFromDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).getFullYear();
    } catch {
      return null;
    }
  };

  // Filter only movie credits and sort by popularity
  const getMovieCredits = () => {
    if (!movieCredits) return [];
    
    // Combine cast and crew
    let allCredits = [...(movieCredits.cast || []), ...(movieCredits.crew || [])];
    
    // Remove duplicates based on movie id
    const uniqueCredits = allCredits.filter((credit, index, self) =>
      index === self.findIndex((c) => c.id === credit.id)
    );

    // Sort by popularity (most popular first)
    uniqueCredits.sort((a, b) => b.popularity - a.popularity);

    return uniqueCredits;
  };

  // Get known for department
  const getKnownForDepartment = () => {
    if (!person) return '';
    return person.known_for_department || 'Acting';
  };

  // Get top movie works (most popular)
  const getTopMovieWorks = () => {
    const movieCreditsList = getMovieCredits();
    
    return movieCreditsList
      .filter(credit => credit.vote_count > 10) // Only include works with some votes
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6); // Show top 6
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-600 py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-yellow-500 rounded mb-8"></div>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/3">
                <div className="h-[500px] bg-gradient-to-r from-yellow-500 to-yellow-500 rounded-2xl"></div>
              </div>
              <div className="lg:w-2/3 space-y-4">
                <div className="h-12 bg-gradient-to-r from-yellow-400 to-yellow-400 rounded-xl w-3/4"></div>
                <div className="h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !person) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-400 flex items-center justify-center">
        <div className="text-center p-8 bg-yellow-400/90 backdrop-blur-sm rounded-2xl border border-yellow-500">
          <h1 className="text-4xl font-bold text-white mb-4">Error Loading Person</h1>
          <p className="text-yellow-200 mb-6">{error || 'Person not found'}</p>
        </div>
      </div>
    );
  }

  // Main render
  const topMovieWorks = getTopMovieWorks();
  const movieCreditsList = getMovieCredits();

  return (
    <div className="min-h-screen bg-yellow-600 text-white py-8">
      <div className="container mx-auto px-4 my-10">
        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column - Profile image and basic info */}
          <div className="lg:w-1/3">
            {/* Profile image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl border-4 border-yellow-500"
            >
              <Image
                src={
                  person.profile_path
                    ? `${TMDB_IMAGE_BASE}original${person.profile_path}`
                    : '/img/no-profile.png'
                }
                alt={person.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 400px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-600 via-yellow-500/20 to-transparent" />
              
              {/* Badge for known for */}
              <div className="absolute top-4 left-4">
                <span className="px-4 py-1.5 text-white font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 text-sm rounded-full shadow-lg">
                  {getKnownForDepartment()}
                </span>
              </div>

              {/* Stats badge */}
              {/* <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-yellow-300">{movieCredits?.cast?.length || 0}</div>
                    <div className="text-xs text-yellow-200">Movies</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-300">{movieCredits?.crew?.length || 0}</div>
                    <div className="text-xs text-yellow-200">Crew</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-300">{movieCreditsList.length}</div>
                    <div className="text-xs text-yellow-200">Total</div>
                  </div>
                </div>
              </div> */}
            </motion.div>

            {/* Basic info card */}
            <div className="mt-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 border border-yellow-600 shadow-lg">
              <h3 className="text-2xl mb-4 text-white font-bold border-b border-yellow-600 pb-2">
                Personal Info
              </h3>
              
              <div className="space-y-5">
                {/* Name and Gender */}
                <div className="pb-4">
                  <h1 className="text-2xl font-bold text-white">{person.name}</h1>
                </div>

                {/* Birth and Death */}
                <div className="space-y-3">
                  {person.birthday && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-400 to-yellow-500/50 rounded-xl border border-yellow-600">
                      {/* <FaBirthdayCake className="text-yellow-400 mt-1" /> */}
                      <div className="flex-1">
                        <div className="font-semibold text-white">Born</div>
                        <div className="text-white">
                          {formatDate(person.birthday)}
                          {calculateAge(person.birthday, person.deathday) && (
                            <span className="ml-2 text-yellow-600 text-sm">
                              (Age {calculateAge(person.birthday, person.deathday)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {person.deathday && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-400/50 to-yellow-600 rounded-xl border border-yellow-600">
                      {/* <FaHeart className="text-white mt-1" /> */}
                      <div className="flex-1">
                        <div className="font-semibold text-white">Died</div>
                        <div className="text-white">
                          {formatDate(person.deathday)}
                          {calculateAge(person.birthday, person.deathday) && (
                            <span className="ml-2 text-yellow-300 text-sm">
                              (Age {calculateAge(person.birthday, person.deathday)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Place of Birth */}
                {person.place_of_birth && (
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-xl border border-yellow-400">
                    <FaMapMarkerAlt className="text-yellow-800 mt-1" />
                    <div>
                      <div className="font-semibold text-white">Place of Birth</div>
                      <div className="text-white">{person.place_of_birth}</div>
                    </div>
                  </div>
                )}

                {/* Also known as */}
                {/* {person.also_known_as && person.also_known_as.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl border border-yellow-600">
                    <div className="font-semibold text-white mb-2">Also Known As</div>
                    <div className="space-y-1">
                      {person.also_known_as.slice(0, 1).map((name, index) => (
                        <div key={index} className="text-white text-sm py-1 px-2 bg-yellow-800/50 rounded-lg">
                          {name}
                        </div>
                      ))}
                      {person.also_known_as.length > 3 && (
                        <div className="text-yellow-300 text-sm mt-1">
                          +{person.also_known_as.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )} */}

                {/* External links */}
                <div className="pt-4 border-t border-yellow-600">
                  <div className="font-semibold text-white mb-3">External Links</div>
                  <div className="flex flex-wrap gap-2">
                    {person.external_ids?.imdb_id && (
                      <a
                        href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-yellow-900 font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                        title="IMDb Profile"
                      >
                        <SiImdb className="text-lg" /> IMDb
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Biography and filmography */}
          <div className="lg:w-2/3">
            {/* Biography */}
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 border border-yellow-600 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Biography
                </h2>
                {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full border border-yellow-500">
                  <FaCalendarAlt className="text-yellow-300" />
                  <span className="font-semibold text-white">
                    {getYearFromDate(person.birthday) || 'N/A'}
                  </span>
                </div> */}
              </div>
              
              <div className="space-y-4">
                <div className={`text-white leading-relaxed ${!showFullBio && 'line-clamp-6'}`}>
                  {person.biography || 'No biography available.'}
                </div>
                
                {person.biography && person.biography.length > 500 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-white hover:text-yellow-600 font-bold transition-colors flex items-center gap-1"
                  >
                    {showFullBio ? 'Show less' : 'Read more'}
                    <span className="text-lg">{showFullBio ? '↑' : '↓'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Known for - Top movie works */}
            {topMovieWorks.length > 0 && (
              <div className="mb-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 border border-yellow-600 shadow-lg">
                <h3 className="text-2xl font-bold mb-6 text-white">
                  Known For
                </h3>
                <div className="grid grid-cols-6">
                  {topMovieWorks.map((work) => (
                    <Link
                      key={`${work.id}`}
                      href={`/movies/${work.id}`}
                      className="group"
                    >
                      <div className="relative h-48 rounded-xl overflow-hidden border-2 border-yellow-400 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                        <Image
                          src={
                            work.poster_path
                              ? `${TMDB_IMAGE_BASE}w342${work.poster_path}`
                              : '/img/no-poster.png'
                          }
                          alt={work.title}
                          fill
                          className="object-cover group-hover:scale-110 transition duration-300"
                          sizes="(max-width: 768px) 50vw, 342px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-400 via-yellow-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="text-sm font-bold text-white truncate drop-shadow-lg">
                            {work.title}
                          </div>
                          <div className="text-xs text-yellow-200 mt-1">
                            {getYearFromDate(work.release_date) || 'N/A'}
                          </div>
                        </div>
                        {work.vote_average > 0 && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-800/90 backdrop-blur-sm px-2 py-1 rounded-full">
                            <FaStar className="text-yellow-300 text-xs" />
                            <span className="text-xs font-bold text-white">{work.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filmography - Movies Only */}
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl border border-yellow-600 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-yellow-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-4xl font-bold text-white">
                    Filmography
                  </h3>
                  {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-600 rounded-full">
                    <FaFilm className="text-yellow-300" />
                    <span className="font-bold text-white">
                      {movieCreditsList.length} Movies
                    </span>
                  </div> */}
                </div>
                
                {/* Stats bar */}
                {/* <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">{movieCredits?.cast?.length || 0}</div>
                    <div className="text-xs text-yellow-200">Acting Roles</div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">{movieCredits?.crew?.length || 0}</div>
                    <div className="text-xs text-yellow-200">Crew Roles</div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">
                      {movieCreditsList.filter(c => c.vote_average >= 7).length}
                    </div>
                    <div className="text-xs text-yellow-200">Highly Rated</div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-300">
                      {movieCreditsList.filter(c => c.release_date && new Date(c.release_date).getFullYear() >= 2020).length}
                    </div>
                    <div className="text-xs text-yellow-200">Recent</div>
                  </div>
                </div> */}
              </div>

              {/* Credits list */}
             <div className="max-h-[500px] overflow-y-auto">
  {movieCreditsList.length > 0 ? (
    <div className="divide-y divide-yellow-700">
      {movieCreditsList
        .filter(credit => credit.poster_path) // Filter only items with poster_path
        .map((credit) => (
          <Link
            key={`${credit.id}-${credit.credit_id || Math.random()}`}
            href={`/movies/${credit.id}`}
            className="block transition-all duration-200 hover:bg-gradient-to-r from-yellow-700/50 to-yellow-600/50"
          >
            <div className="p-4 flex items-center gap-4">
              {/* Poster */}
              <div className="relative h-20 w-14 flex-shrink-0 rounded-lg overflow-hidden border border-yellow-600 shadow">
                <Image
                  src={`${TMDB_IMAGE_BASE}w92${credit.poster_path}`}
                  alt={credit.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-white truncate">
                    {credit.title}
                  </h4>
                  <span className="text-sm text-white font-medium">
                    ({getYearFromDate(credit.release_date) || 'N/A'})
                  </span>
                  {credit.character && (
                    <span className="text-sm bg-gradient-to-r from-yellow-700 to-yellow-600 text-white px-2 py-0.5 rounded-full border border-yellow-500">
                      as {credit.character}
                    </span>
                  )}
                  {credit.job && (
                    <span className="text-sm bg-gradient-to-r from-yellow-300 to-yellow-400 text-white px-2 py-0.5 rounded-full border border-yellow-600">
                      {credit.job}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-2 mb-2">
                  {credit.vote_average > 0 && (
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-700" />
                      <span className="text-sm font-bold text-yellow-700">
                        {credit.vote_average.toFixed(1)}
                      </span>
                      <span className="text-xs text-yellow-700">
                        ({credit.vote_count} votes)
                      </span>
                    </div>
                  )}
                  
                  {credit.release_date && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-yellow-600">
                        {formatDate(credit.release_date)}
                      </span>
                    </div>
                  )}
                </div>
                
                {credit.overview && (
                  <p className="text-sm text-white line-clamp-2">
                    {credit.overview}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
    </div>
  ) : (
    <div className="p-8 text-center text-yellow-300">
      <FaFilm className="text-3xl mx-auto mb-3 opacity-70" />
      <p className="text-lg font-bold">No movie credits found for this person.</p>
    </div>
  )}
</div>
            </div>

        
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonPage;