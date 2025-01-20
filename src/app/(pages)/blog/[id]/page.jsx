import React from "react"
import Image from "next/image"
import Link from "next/link"
import AuthorInfo from "@/app/components/AuthorInfo/author"

// Separate data fetching function
const getData = async (id) => {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/blog/${id}`, {
      cache: "no-store",
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch data. Status: ${res.status}`)
    }

    const data = await res.json()
    console.log("Fetched data:", data)
    return data
  } catch (error) {
    console.error("Error fetching blog post:", error)
    throw error
  }
}

const BlogPostPage = async ({ params }) => {
  const { id } = params

  let data
  try {
    data = await getData(id)
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>Error loading blog post. Please try again later.</p>
        </div>
      </div>
    )
  }

  // Create markup for content instead of title
  function createMarkup() {
    return { __html: data?.content || "" }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-12 w-full justify-between">
          {/* Content Section */}
          <div className="w-full lg:w-1/2 flex flex-col gap-10">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold w-full lg:w-[86%] leading-tight">{data?.title}</h1>

            {/* Content */}
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={createMarkup()} />

            {/* Author Info */}
            <AuthorInfo data={data} />
          </div>

          {/* Image Section */}
          <div className="w-full lg:w-1/2">
            <div className="sticky top-8">
              <Image
                className="rounded-lg w-full object-cover shadow-lg"
                src={data.thumbnail || "/default-image.jpg"}
                alt={data.title}
                width={800}
                height={600}
                priority
              />
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-16 w-full lg:w-2/3">
          {/* Placeholder for comments section */}
          <h2 className="text-2xl font-bold mb-4">Comments</h2>
          <p className="text-gray-400">Comments section coming soon...</p>
        </div>
      </div>
    </div>
  )
}

export default BlogPostPage

