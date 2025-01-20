'use client';

import Image from "next/image";
import StarRating from '@/app/components/StarRating/StarRating';

const MovieInfo = ({ item, averageRating, userRating, ratingCount, onRatingChange }) => {
    const getDirector = (crew) => {
        return crew.find((member) => member.job === "Director")?.name || "Unknown";
    };

    const getWriters = (crew) => {
        return crew
            .filter((member) => member.department === "Writing")
            .map((writer) => writer.name)
            .join(", ") || "Unknown";
    };

    const getCast = (cast, limit = 5) => {
        return cast.slice(0, limit).map((actor) => actor.name).join(", ");
    };

    const getProductionCompanies = (companies) => {
        return companies.map((company) => company.name).join(", ");
    };

    return (
        <div className="min-h-screen py-8">
            <div className="container mx-auto px-4">
                <div className="bg-white  rounded-xl shadow-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row md:space-x-8 p-6">
                        {/* Movie Poster */}
                        <div className="flex-shrink-0 mb-6 md:mb-0">
                            <div className="relative w-full md:w-[280px] h-[420px] rounded-lg overflow-hidden shadow-md">
                                <Image
                                    src={
                                        item.poster_path
                                            ? `https://image.tmdb.org/t/p/original${item.poster_path}`
                                            : `/img/NoImage.jpg`
                                    }
                                    alt={item.title || "Movie Image"}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 280px"
                                />
                            </div>
                        </div>

                        {/* Movie Details */}
                        <div className="flex-grow">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                {item.original_title}
                            </h1>
                            
                            <div className="space-y-4">
                                {/* Release Date and Runtime */}
                                <div className="flex items-center space-x-4 text-gray-600">
                                    <span className="text-lg">{new Date(item.release_date).getFullYear()}</span>
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                    <span className="text-lg">{item.runtime} mins</span>
                                </div>

                                {/* Movie Info Grid */}
                                <div className="grid grid-cols-1 gap-4 mt-6">
                                    <InfoRow label="Director" value={getDirector(item.credits?.crew || [])} />
                                    <InfoRow label="Writers" value={getWriters(item.credits?.crew || [])} />
                                    <InfoRow label="Cast" value={getCast(item.credits?.cast || [])} />
                                    <InfoRow 
                                        label="Production" 
                                        value={getProductionCompanies(item.production_companies || [])} 
                                    />
                                </div>

                                {/* Rating Section */}
                                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                                    <div className="mb-4">
                                        <StarRating
                                            movieId={item.id}
                                            initialRating={userRating}
                                            onRatingChange={onRatingChange}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p className="flex items-center">
                                            <span className="font-medium">Platform Rating:</span>
                                            <span className="ml-2">
                                                {averageRating ? (
                                                    <>
                                                        <span className="text-lg font-bold text-yellow-500">
                                                            {averageRating.toFixed(1)}
                                                        </span>
                                                        <span className="ml-1">
                                                            stars ({ratingCount} ratings)
                                                        </span>
                                                    </>
                                                ) : (
                                                    "N/A"
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for consistent info row styling
const InfoRow = ({ label, value }) => (
    <div className="space-y-1">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="text-base text-gray-900">{value}</dd>
    </div>
);

export default MovieInfo;
