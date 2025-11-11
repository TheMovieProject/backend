"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImCross } from "react-icons/im";
import { useSession } from "next-auth/react";
import axios from "axios";

const EditProfile = ({ setProfile , userId }) => {
  const { data: session, update } = useSession();
  
  // Form states
  const [avatar, setAvatar] = useState(session?.user?.avatarUrl || null);
  const [username, setUsername] = useState(session?.user?.username || "");
  const [bio, setBio] = useState(session?.user?.bio || "");
  const [movieGenres, setMovieGenres] = useState(session?.user?.movieGenres || []);
  const [currentGenre, setCurrentGenre] = useState("");
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    avatar: null,
    username: null,
    bio: null,
    movieGenres: null,
    submit: null
  });

  // Debug logging
  useEffect(() => {
    console.log("Session data:", session);
    console.log("Current form state:", {
      avatar,
      username,
      bio,
      movieGenres
    });
  }, [session, avatar, username, bio, movieGenres]);

  const validateForm = () => {
    const newErrors = {};
    
    // Username validation
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    // Bio validation
    if (bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }

    // Movie genres validation
    if (movieGenres.length > 10) {
      newErrors.movieGenres = "Maximum 10 genres allowed";
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setErrors(prev => ({ 
            ...prev, 
            avatar: "Image must be less than 5MB" 
          }));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          console.log("Avatar loaded successfully");
          setAvatar(reader.result);
          setErrors(prev => ({ ...prev, avatar: null }));
        };
        reader.onerror = () => {
          console.error("Error reading file:", reader.error);
          setErrors(prev => ({ 
            ...prev, 
            avatar: "Error reading file" 
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Avatar change error:", error);
      setErrors(prev => ({ 
        ...prev, 
        avatar: "Failed to process image" 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Starting form submission...");

    // Validate form
    if (!validateForm()) {
      console.log("Form validation failed:", errors);
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, submit: null }));

    try {
      console.log("Sending data to server:", {
        username,
        bio,
        avatarUrl: avatar,
        movieGenres,
      });

      const response = await axios.put(`/api/user/${userId}`, {
        username,
        bio,
        avatarUrl: avatar,
        movieGenres,
      });

      console.log("Server response:", response.data);

      // Update the session with new user data
      await update({
        ...session,
        user: {
          ...session?.user,
          username,
          bio,
          avatarUrl: avatar,
          movieGenres,
        },
      });

      console.log("Session updated successfully");
      setProfile(false);
    } catch (error) {
      console.error("Profile update error:", error);
      setErrors(prev => ({ 
        ...prev, 
        submit: error.response?.data?.message || "Failed to update profile" 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const addGenre = () => {
    try {
      if (currentGenre && !movieGenres.includes(currentGenre)) {
        if (movieGenres.length >= 10) {
          setErrors(prev => ({ 
            ...prev, 
            movieGenres: "Maximum 10 genres allowed" 
          }));
          return;
        }
        setMovieGenres([...movieGenres, currentGenre]);
        setCurrentGenre("");
        setErrors(prev => ({ ...prev, movieGenres: null }));
      }
    } catch (error) {
      console.error("Add genre error:", error);
    }
  };

  const removeGenre = (genre) => {
    try {
      setMovieGenres(movieGenres.filter((g) => g !== genre));
    } catch (error) {
      console.error("Remove genre error:", error);
    }
  };

  return (
    <div className="w-full h-full max-w-md mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
        <h2 className="text-md font-bold text-gray-800">Edit Profile</h2>
        <div className="cursor-pointer">
          <ImCross size={15} onClick={() => setProfile(false)} />
        </div>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <Image
                width={80}
                height={80}
                src={avatar || "/placeholder.svg"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <label
                htmlFor="avatar"
                className="cursor-pointer bg-yellow-900 text-white hover:bg-yellow-600 px-3 py-1 rounded-md transition duration-300 text-sm inline-block"
              >
                Upload Image
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {errors.avatar && (
                <p className="mt-1 text-xs text-red-500">{errors.avatar}</p>
              )}
            </div>
          </div>

          <div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors(prev => ({ ...prev, username: null }));
              }}
              placeholder="Your username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-900 text-sm"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username}</p>
            )}
          </div>

          <div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setErrors(prev => ({ ...prev, bio: null }));
              }}
              placeholder="Tell us about yourself"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-red-500">{errors.bio}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="movieGenre" className="block text-sm font-medium text-gray-700">
              Favorite Movie Genres
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="movieGenre"
                type="text"
                value={currentGenre}
                onChange={(e) => {
                  setCurrentGenre(e.target.value);
                  setErrors(prev => ({ ...prev, movieGenres: null }));
                }}
                placeholder="Add a movie genre"
                className="flex-grow px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              />
              <button
                type="button"
                onClick={addGenre}
                className="px-3 py-1 bg-yellow-900 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm"
              >
                Add
              </button>
            </div>
            {errors.movieGenres && (
              <p className="mt-1 text-xs text-red-500">{errors.movieGenres}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {movieGenres.map((genre, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-200 rounded-full text-xs flex items-center"
                >
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    <ImCross size={8} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </form>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t">
        {errors.submit && (
          <p className="mb-2 text-sm text-red-500 text-center">{errors.submit}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-yellow-900 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition duration-300 text-sm disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditProfile;