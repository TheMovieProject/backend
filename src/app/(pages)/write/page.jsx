'use client'
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { storage } from "@/app/utils/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from '@/app/(pages)/write/firebaseConfig';
import { useSession } from "next-auth/react";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  Type, 
  Hash, 
  Image as ImageIcon, 
  Eye, 
  EyeOff,
  HelpCircle,
  Film,
  Clapperboard,
  Star,
  Menu,
  X
} from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
    </div>
  ),
});

const QuillStyles = () => {
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
  }, []);
  return null;
};

const WritingAssistant = ({ content, title }) => {
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const newSuggestions = [];
    
    if (words.length > 0) {
      if (words.length < 100) {
        newSuggestions.push('Consider writing a more detailed review or analysis');
      }
      
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength > 30) {
        newSuggestions.push('Some sentences are quite long. Consider breaking them up for better readability');
      }
    }
    
    if (title && title.length < 15) {
      newSuggestions.push('Your title could be more engaging for movie readers');
    }
    
    const movieKeywords = ['plot', 'character', 'cinematography', 'director', 'acting', 'scene', 'ending'];
    const hasMovieElements = movieKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (!hasMovieElements && words.length > 50) {
      newSuggestions.push('Consider discussing specific movie elements like plot, characters, or cinematography');
    }
    
    setSuggestions(newSuggestions);
  }, [content, title]);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4 mb-6">
      <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2 text-sm md:text-base">
        <HelpCircle size={16} />
        Writing Tips for Movie Review
      </h4>
      <ul className="text-xs md:text-sm text-yellow-800 space-y-1">
        {suggestions.map((suggestion, index) => (
          <li key={index}>• {suggestion}</li>
        ))}
      </ul>
    </div>
  );
};

const Page = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [blogNumber, setblognumber] = useState(1);
  const [hashtags, setHashtags] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(content.length);
  }, [content]);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
    },
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'code-block'
  ];

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }

      setThumbnail(URL.createObjectURL(file));
      const storageRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setUploading(true);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        },
        (error) => {
          console.error('Error uploading file:', error);
          setUploading(false);
          alert('Failed to upload image. Please try again.');
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setThumbnail(url);
          setUploading(false);
        }
      );
    } else {
      alert('Please select a valid image file (JPEG, PNG, WebP)');
    }
  };

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill out title and content');
      return;
    }

    if (status === "loading") {
      return;
    }
    
    if (!session?.user?.email) {
      alert('Please sign in to create a movie review');
      return;
    }

    setIsPublishing(true);

    try {
      const payload = {
        title,
        thumbnail,
        hashtags,
        content,
        blogNumber,
        userEmail: session.user.email,
      };

      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert('Movie review published successfully! 🎬');
      setTitle('');
      setHashtags('');
      setContent('');
      setThumbnail('');
      setblognumber(blogNumber + 1);
      router.push('/');

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to publish review. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 flex items-center justify-center pt-16 md:pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 text-white pt-16 md:pt-20">
      <QuillStyles />
      
      {/* Header - Responsive */}
      <div className="bg-yellow-800/20 border-b border-yellow-500/30 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and stats */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <Clapperboard size={20} className="md:size-6 text-yellow-500" />
                <h1 className="text-xl md:text-2xl font-bold text-white">New Blog</h1>
              </div>
              
              {/* Stats - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-300">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-yellow-400 transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Desktop buttons */}
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-yellow-400 transition-colors border border-yellow-500/30 rounded-lg hover:border-yellow-500/50"
                >
                  {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
                  {previewMode ? 'Edit' : 'Preview'}
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={isPublishing}
                  className="px-4 md:px-6 py-2 bg-yellow-500 text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Film size={16} />
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile stats and actions */}
          <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} pt-3 border-t border-yellow-500/20`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300">
                {wordCount} words • {charCount} chars
              </div>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-300 hover:text-yellow-400 transition-colors border border-yellow-500/30 rounded"
              >
                {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isPublishing}
              className="w-full px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Film size={16} />
              {isPublishing ? 'Publishing...' : 'Publish Movie Review'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* Writing Assistant */}
        <WritingAssistant content={content} title={title} />

        {previewMode ? (
          // Preview Mode - Responsive
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-yellow-300/20 overflow-hidden">
            {thumbnail && (
              <div className="mb-6 md:mb-8">
                <Image
                  width={800}
                  height={400}
                  src={thumbnail}
                  alt="Movie thumbnail"
                  className="w-full h-48 md:h-80 object-cover"
                  priority
                />
              </div>
            )}
            
            <div className="p-4 md:p-8">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Star className="text-yellow-500 md:size-6" size={18}  />
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                  {title || 'Untitled Movie Review'}
                </h1>
              </div>
              
              {hashtags && (
                <div className="flex flex-wrap gap-1 md:gap-2 mb-6 md:mb-8">
                  {hashtags.split('#').filter(tag => tag.trim()).map((tag, index) => (
                    <span key={index} className="px-2 md:px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs md:text-sm border border-yellow-500/30">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              
              <div 
                className="prose prose-sm md:prose-lg max-w-none prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-yellow-400 prose-blockquote:border-yellow-500 prose-blockquote:text-gray-400 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        ) : (
          // Edit Mode - Responsive
          <div className="space-y-4 md:space-y-6">
            {/* Thumbnail Upload */}
            <div className="rounded-xl shadow-lg border border-yellow-300/20 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <ImageIcon size={18} className="md:size-6 text-yellow-500" />
                <h3 className="font-semibold text-white text-sm md:text-base">Movie Poster</h3>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {thumbnail ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Image
                    width={120}
                    height={160}
                    src={thumbnail}
                    alt="Movie poster preview"
                    className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded-lg border-2 border-yellow-500/50"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-green-400 mb-2">Poster uploaded successfully</p>
                    <button
                      onClick={handleThumbnailClick}
                      className="text-sm text-yellow-400 hover:text-yellow-300"
                    >
                      Change poster
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handleThumbnailClick}
                  className="border-2 border-dashed border-yellow-500/30 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:border-yellow-500/50 transition-colors group"
                >
                  <Upload size={24} className="md:size-8 mx-auto text-yellow-500/60 group-hover:text-yellow-500 mb-2 md:mb-3" />
                  <p className="text-gray-300 mb-1 text-sm md:text-base group-hover:text-white">Click to upload movie poster</p>
                  <p className="text-xs md:text-sm text-gray-400">Recommended: 600x800 pixels (movie poster ratio)</p>
                </div>
              )}
              
              {uploading && (
                <div className="mt-3 md:mt-4 flex items-center gap-2 text-yellow-500 text-sm">
                  <div className="animate-spin rounded-full h-3 md:h-4 w-3 md:w-4 border-b-2 border-yellow-500"></div>
                  Uploading poster...
                </div>
              )}
            </div>

            {/* Title Input */}
            <div className="rounded-xl shadow-lg border border-yellow-500/20 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <Type size={18} className="md:size-6 text-yellow-500" />
                <h3 className="font-semibold text-white text-sm md:text-base">Review Title</h3>
              </div>
              <input
                type="text"
                placeholder="An Honest Review of [Movie Title]..."
                className="w-full text-xl md:text-3xl font-bold bg-transparent text-white placeholder-gray-500 outline-none border-none focus:ring-0 p-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Hashtags */}
            <div className="rounded-xl shadow-lg border border-yellow-500/20 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <Hash size={18} className="md:size-6 text-yellow-500" />
                <h3 className="font-semibold text-white text-sm md:text-base">Movie Genres & Tags</h3>
              </div>
              <input
                type="text"
                placeholder="#action #thriller #2024 #cinematography #acting (separate with spaces)"
                className="w-full bg-transparent border-none text-gray-300 placeholder-gray-500 outline-none focus:ring-0 p-0 text-sm md:text-base"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
            </div>

            {/* Content Editor */}
            <div className="rounded-xl shadow-lg border border-yellow-500/20 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 md:p-6 border-b border-yellow-500/20">
                <h3 className="font-semibold text-white text-sm md:text-base">Your Movie Review</h3>
                <div className="flex-1"></div>
                <div className="text-xs md:text-sm text-gray-400">
                  {wordCount} words • {charCount} characters
                </div>
              </div>
              
              <div className="min-h-[700px] md:min-h-[500px]">
                {mounted && (
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    formats={formats}
                    placeholder="Share your thoughts on the movie... Discuss plot, characters, cinematography, acting, and your overall rating..."
                    className="h-auto min-h-[700px] md:min-h-[500px] border-none text-white"
                  />
                )}
              </div>
            </div>

            {/* Mobile Publish Button - Sticky */}
            <div className="md:hidden bottom-4 z-30">
              <button
                onClick={handleSubmit}
                disabled={isPublishing || !title.trim() || !content.trim()}
                className="w-full px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Film size={18} />
                    Publish Review
                  </>
                )}
              </button>
            </div>

            {/* Desktop Publish Button */}
            <div className="hidden md:flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isPublishing || !title.trim() || !content.trim()}
                className="px-8 py-3 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg shadow-yellow-500/25"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Film size={18} />
                    Publish Movie Review
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;