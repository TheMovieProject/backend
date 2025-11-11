import React, { useState, useEffect, useRef } from "react";
import { Rate } from "antd";

const StarRating = ({ movieId, initialRating = 0, onRatingChange }) => {
  const [rating, setRating] = useState(initialRating);
  const [pending, setPending] = useState(false);
  const prevRef = useRef(initialRating);

  useEffect(() => {
    setRating(initialRating);
    prevRef.current = initialRating;
  }, [initialRating]);

  const handleChange = async (value) => {
    if (pending) return;
    setPending(true);

    // optimistic update
    const prev = prevRef.current;
    setRating(value);

    try {
      const res = await fetch("/api/userRating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: String(movieId), value }),
      });

      if (!res.ok) throw new Error(await res.text());

      // Expect the API to return: { userRating, averageRating, ratingCount }
      const data = await res.json();
      prevRef.current = data.userRating ?? value;
      setRating(data.userRating ?? value);

      // Tell parent to refresh local aggregates
      onRatingChange?.(data.userRating ?? value, data.averageRating, data.ratingCount);
    } catch (e) {
      // rollback on failure
      setRating(prev);
      console.error("rating error:", e);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="text-gray-300 text-sm">
      Your rating:{" "}
      <Rate
        allowHalf
        disabled={pending}
        value={rating}
        onChange={handleChange}
        tooltips={["Bad", "OK", "Good", "Very Good", "Excellent"]}
      />
      {pending && <span className="ml-2 text-xs text-yellow-400">saving…</span>}
    </div>
  );
};

export default StarRating;
