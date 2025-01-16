'use client'
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { storage } from "@/app/utils/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from '@/app/(pages)/write/firebaseConfig'
import { useSession } from "next-auth/react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

const QuillStyles = () => {
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
  }, []);
  return null;
};

const Page = () => {
  const router = useRouter()
  const [title, setTitle] = useState('');
  const [blogNumber , setblognumber]=useState(1);
  const [hashtags, setHashtags] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  // const [thumbnailURL, setThumbnailURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);

    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);
      const storageRef = ref(storage, `thumbnails/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setUploading(true);
      console.log('Uploading file to Firebase...');

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error('Error uploading file:', error);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setThumbnail(url);
          setUploading(false);
          console.log('File uploaded successfully. URL:', url);
        }
      );
    } else {
      alert('Please select a valid image file');
      console.log('Invalid file type selected.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    console.log('Submit button clicked');

    if (!title.trim() || !content.trim()) {
      alert('Please fill out all fields');
      console.log('Title or content is empty');
      return;
    }

    console.log('Form data is valid. Sending request...');

    // Check authentication
    if (status === "loading") {
      console.log("Session is loading...");
      return;
    }
    
    if (!session?.user?.email) {
      alert('Please sign in to create a post');
      console.log('User not authenticated');
      return;
    }

    try {
      const payload = {
        title,
        thumbnail,
        hashtags,
        content,
        blogNumber,
        userEmail: session.user.email, // Use email instead of ID
      };
       console.log(session.user.email)
      if (thumbnail) {
        payload.thumbnail = thumbnail;
      }

      console.log('Sending payload:', payload);

      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      router.push('/')

      console.log('API response received:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Post created:', result);

      // Reset form
      setTitle('');
      setHashtags('');
      setContent('');
      setThumbnail('');
      setblognumber(blogNumber+1);

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  if (!mounted) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <QuillStyles />
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            placeholder="Enter your title"
            className="p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Hashtags</label>
          <input
            type="text"
            placeholder="#nextjs #react"
            className="p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
          />
        </div>

        <div>
  <label className="block text-sm font-medium mb-2">Thumbnail</label>
  <input
    type="file"
    accept="image/*"
    className="p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    onChange={handleFileChange}
  />
  {uploading && <p className="text-sm text-blue-500 mt-2">Uploading thumbnail...</p>}
  {thumbnail && (
    <div className="mt-4">
      <p className="text-sm text-green-500">Thumbnail uploaded successfully:</p>
      <Image
        width={100}
        height={100}
        src={thumbnail}
        alt="Thumbnail Preview"
        className="w-32 h-32 object-cover rounded border mt-2"
      />
    </div>
  )}
</div>


        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          {mounted && (
            <div className="border rounded">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                className="h-[150vh] mb-12"
              />
            </div>
          )}
        </div>

        <button
          className="w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors duration-200"
          onClick={handleSubmit}
        >
          Publish Post
        </button>
      </div>
    </div>
  );
};

export default Page;