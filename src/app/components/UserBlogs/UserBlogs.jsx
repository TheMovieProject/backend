'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

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
        
        if (id && id !== 'undefined') {
          const userDetailsResponse = await fetch(`/api/user/${id}`);
          if (!userDetailsResponse.ok) {
            const errorData = await userDetailsResponse.json();
            throw new Error(errorData.message || 'Failed to fetch user details');
          }
          userData = await userDetailsResponse.json();
          setUserDetails(userData);
        }

        const emailToFetch = userData?.email || session?.user?.email;
        
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
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
                <div className="h-48 bg-gray-700 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-8">
        {userDetails ? `${userDetails.username}'s Stories` : 'Your Stories'}
      </h1>
      
      {blogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No stories yet</p>
          <p className="text-gray-500 text-sm mt-2">Start writing your cinematic journey</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <Link 
              href={`/blog/${blog.id}`} 
              key={blog.id} 
              className="group"
            >
              <div className="bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 p-4 border border-gray-200">
                {/* Blog Thumbnail Polaroid */}
                <div className="aspect-[3/4]  overflow-hidden mb-4 bg-gradient-to-br from-orange-400 to-yellow-500">
                  {blog.thumbnail ? (
                    <Image
                      src={blog.thumbnail}
                      alt={blog.title}
                      width={200}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-center p-4">
                      <div>
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{blog.title}</h3>
                        <p className="text-xs opacity-90">No thumbnail</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Blog Title */}
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </p> 
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBlogs;