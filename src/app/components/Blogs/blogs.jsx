'use client'
import React, { useEffect, useState } from 'react';
import BlogCard from '@/app/components/BlogCard/BlogCard';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the blogs data
  const getBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/blog`); // Just use the relative path
      
      if (!res.ok) {
        throw new Error('Failed to fetch blogs');
      }
      
      const data = await res.json();
      setBlogs(data); // Handle both cases where data might be {posts: []} or just []
      setError(null);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setError('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBlogs();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto p-4">
        <div className="text-[2.2rem] mb-4">Blogs</div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto p-4">
        <div className="text-[2.2rem] mb-4">Blogs</div>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto p-4">
      <div className="text-[2.2rem] mb-4">Blogs</div>
      <div className="grid gap-6">
        {blogs.length > 0 ? (
          blogs.map((item) => (
            <BlogCard key={item._id} item={item} /> // Use _id for MongoDB
          ))
        ) : (
          <div>No blogs available.</div>
        )}
      </div>
    </div>
  );
};

export default Blogs;