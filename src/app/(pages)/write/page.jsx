'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill with no SSR
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

// Import styles in a separate component to avoid SSR issues
const QuillStyles = () => {
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
  }, []);
  return null;
};

const Page = () => {
  const [title, setTitle] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnail(file);
    } else {
      alert('Please select an image file');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('hashtags', hashtags);
    formData.append('content', content);
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    try {
      const response = await fetch('/api/blog/create', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Post created:', result);
      // Reset form
      setTitle('');
      setHashtags('');
      setContent('');
      setThumbnail(null);
      
      // You might want to redirect here
      // window.location.href = '/blog' or use Next.js router
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  if (!mounted) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className='p-10 max-w-4xl mx-auto'>
      <QuillStyles />
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input 
            type="text" 
            placeholder='Enter your title' 
            className='p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Hashtags</label>
          <input 
            type="text" 
            placeholder='#nextjs #react' 
            className='p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Thumbnail</label>
          <input 
            type="file" 
            accept="image/*"
            className='p-2 w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            onChange={handleFileChange}
          />
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
                className="h-64 mb-12"
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