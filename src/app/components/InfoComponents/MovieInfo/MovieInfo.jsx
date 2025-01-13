"use client";
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
        <div className="p-10 flex gap-32">
            <div>
                <Image
                    className="w-[15rem] rounded-md"
                    src={
                        item.poster_path
                            ? `https://image.tmdb.org/t/p/original${item.poster_path}`
                            : NoImage
                    }
                    alt={item.title || "Movie Image"}
                    width={240}
                    height={360}
                />
            </div>
            <div>
                <h1 className="text-black text-[2rem]">{item.original_title}</h1>
                <p className="text-black text-[1.3rem]">{item.release_date}</p>
                <p className="text-black">Director: {getDirector(item.credits?.crew || [])}</p>
                <p className="text-black">Writers: {getWriters(item.credits?.crew || [])}</p>
                <p className="text-black">Cast: {getCast(item.credits?.cast || [])}</p>
                <p className="text-black">Production Companies: {getProductionCompanies(item.production_companies || [])}</p>
                <p>Run Time: {item.runtime} mins</p>
                <div>
                    <StarRating
                        movieId={item.id}
                        initialRating={userRating}
                        onRatingChange={onRatingChange}
                    />
                </div>
                <p>
                    Average Movie Rating of the platform:{" "}
                    {averageRating ? averageRating.toFixed(1) : "N/A"} stars ({ratingCount} ratings)
                </p>
            </div>
        </div>
    );
};

export default MovieInfo;
