import React, { useState, useEffect } from 'react';
import { Rate } from "antd";

const StarRating = ({ movieId, initialRating, onRatingChange }) => {
  const [rating, setRating] = useState(initialRating);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleChange = async (value) => {
    try {
      // Send rating to the backend
      const response = await fetch('/api/userRating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieId, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      // Update state and notify parent
      setRating(value);
      onRatingChange(value);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className='text-gray-600 font-medium text-sm'>
      Your rating: <Rate 
        allowHalf 
        value={rating}
        tooltips={["Bad", "Normal", "Good", "Very Good", "Excellent"]}
        onChange={handleChange}
        onClick={()=>window.location.reload()}

      />
    </div>
  );
};

export default StarRating;


