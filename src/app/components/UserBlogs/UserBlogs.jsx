'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

const UserBlogs = ({ id }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      if (status === 'loading') return;
      
      setLoading(true);
      setError(null);
      
      try {
        const targetUserId = id && id !== 'undefined' ? id : session?.user?.id;
        if (!targetUserId) {
          throw new Error('No user available');
        }

        const userBlogsResponse = await fetch(`/api/blog?userId=${targetUserId}`);
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
  }, [id, status, session?.user?.id]);

  if (status === 'loading' || loading) {
   return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-700/50 border border-white/10" />
          ))}
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
      
      {blogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No  yet</p>
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
              <div  className="relative group rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3 hover:-translate-y-1 hover:shadow-xl transition">
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
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <Image
                        src="/img/logo.png"
                        alt="TheMovieProject"
                        width={72}
                        height={72}
                        className="h-16 w-16 object-contain opacity-90"
                      />
                    </div>
                  )}
                </div>
                
                {/* Blog Title */}
                <div className="text-center">
                  <h3 className="font-semibold text-white text-sm line-clamp-2 leading-tight">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-gray-200 mt-2">
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
