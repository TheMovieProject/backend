'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
const UserBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchUserBlogs = async () => {
      if (status !== 'authenticated' || !session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/blog?userEmail=${session?.user?.email}`);
        if (!response.ok) throw new Error('Failed to fetch blogs');
        const data = await response.json();
        setBlogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBlogs();
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading your blogs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold mb-6">Your Blog Posts</h1>

      {blogs.length === 0 ? (
        <p className="text-gray-500">You havent written any blogs yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <div key={blog.id} className="flex flex-col bg-white rounded-lg shadow-md p-4">
              {/* Blog Thumbnail */}
              {blog.thumbnail && (
                <Image
                width={200}
                height={200}
                  src={blog.thumbnail}
                  alt={blog.title}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              
              {/* Blog Title */}
              <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
              
              {/* Blog Content (Preview) */}
              <p className="text-sm text-gray-500 mb-2">{blog.content.substring(0, 100)}...</p>
              
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBlogs;
