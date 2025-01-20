import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthorInfo from '@/app/components/AuthorInfo/author'
// Separate data fetching function
const getData = async (id) => {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/blog/${id}`, {
    cache: "no-store",
    // next: { revalidate: 0 }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch data. Status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Fetched data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    throw error;
  }
};

const BlogPostPage = async ({ params }) => {
  const { id } = params;
  // let data;

  
    const data = await getData(id);
  //  catch (error) {
  //   return (
  //     <div className="p-4">
  //       <p className="text-red-500">Error loading blog post. Please try again later.</p>
  //     </div>
  //   );
  // }

  // Create markup for content instead of title
  function createMarkup() {
    return { __html: data?.content || '' };
  }


  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className='flex flex-col lg:flex-row items-start gap-6 w-full justify-between'>
        {/* Content Section */}
        <div className='w-full lg:w-1/2 flex flex-col gap-10'>
          {/* Title */}
          <h1 className="text-[2.2rem] font-bold w-full lg:w-[86%]">
            {data?.title}
          </h1>

          {/* Content */}
          <div className='prose max-w-none' dangerouslySetInnerHTML={createMarkup()} />

          {/* Author Info */}
           <AuthorInfo data={data}/>
        </div>

        {/* Image Section */}
        <div className="w-full lg:w-1/2 hidden lg:block">
          <Image
            className='rounded-md w-full object-cover'
            src={data.thumbnail || defaultImage}
            alt={data.title}
            width={400}
            height={300}
            priority
          />
        </div>
      </div>

      {/* Comments Section */}
      <div className='mt-8 w-full lg:w-2/3'>
        {/* <Comments postSlug={id}/> */}
      </div>
    </div>
  );
};

export default BlogPostPage;