'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const UserBlogs = ({ id }) => {
  const [blogs, setBlogs] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      if (status === 'loading') return;
      
      setLoading(true);
      setError(null);
      
      try {
        let userData = null;
        
        // Only fetch user details if an ID is provided
        if (id && id !== 'undefined') {
          const userDetailsResponse = await fetch(`/api/user/${id}`);
          if (!userDetailsResponse.ok) {
            const errorData = await userDetailsResponse.json();
            throw new Error(errorData.message || 'Failed to fetch user details');
          }
          userData = await userDetailsResponse.json();
          setUserDetails(userData);
          console.log(userData)
        }

        // If no ID provided or fetching user details failed, use session user
        const emailToFetch = userData?.email || session?.user?.email;
        console.log(emailToFetch)
        
        if (!emailToFetch) {
          throw new Error('No user email available');
        }

        const userBlogsResponse = await fetch(`/api/blog?userEmail=${emailToFetch}`);
        if (!userBlogsResponse.ok) {
          const errorData = await userBlogsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch blogs');
        }
        
        const blogsData = await userBlogsResponse.json();
        setBlogs(blogsData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, status, session?.user?.email]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading session...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading blogs...</p>
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
      <h1 className="text-2xl font-bold mb-6">
        {userDetails ? `${userDetails.username}'s Blog Posts` : 'Your Blog Posts'}
      </h1>
      {blogs.length === 0 ? (
        <p className="text-gray-500">No blogs found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <div 
              key={blog.id} 
              className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden"
            >
              {blog.thumbnail && (
                <div className="relative w-full h-48">
                  <Image
                    src={blog.thumbnail}
                    alt={blog.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{blog.title}</h3>
                {/* {blog.content && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {blog.content}
                  </p>
                )} */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBlogs;