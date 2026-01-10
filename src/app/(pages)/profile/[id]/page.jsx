'use client';
import { useEffect, useReducer, useMemo, lazy, Suspense, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdLocalMovies, MdArticle, MdClose, MdEdit } from "react-icons/md";
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

// Lazy load heavy components
const UserBlogs = lazy(() => import('@/app/components/UserBlogs/UserBlogs'));
const UserReviews = lazy(() => import('@/app/components/UserReviews/UserReviews'));
const EditProfile = lazy(() => import('@/app/components/EditProfile/EditProfile'));


const initialState = {
  profileData: null,
  isFollowing: false,
  showFollowers: false,
  showFollowing: false,
  showEditProfile: false,
  activeTab: 'reviews',
  loading: true,
  error: null
};

const profileReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PROFILE_DATA':
      return { ...state, profileData: action.payload, loading: false, error: null };
    
    case 'SET_FOLLOW_STATUS':
      return { ...state, isFollowing: action.payload };
    
    case 'TOGGLE_FOLLOWERS_MODAL':
      return { ...state, showFollowers: action.payload };
    
    case 'TOGGLE_FOLLOWING_MODAL':
      return { ...state, showFollowing: action.payload };
    
    case 'TOGGLE_EDIT_PROFILE':
      return { ...state, showEditProfile: action.payload };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'UPDATE_FOLLOW_COUNTS':
      if (!state.profileData) return state;
      return {
        ...state,
        profileData: {
          ...state.profileData,
          stats: {
            ...state.profileData.stats,
            followerCounts: state.profileData.stats.followerCounts + (action.payload.isFollowing ? 1 : -1)
          }
        }
      };
    
    default:
      return state;
  }
};
// ===== END REDUCER SETUP =====

// ===== MEMOIZED COMPONENTS =====
const FollowList = memo(({ type, data, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white">
            <MdClose size={24} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data || data.length === 0 ? (
            <p className="text-center text-gray-300 py-4">No {type.toLowerCase()} yet</p>
          ) : (
            data.map((user) => (
              <Link 
                href={`/profile/${user.id}`} 
                key={user.id}
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Image 
                  src={user.avatarUrl || user.image || '/img/profile.png'}
                  width={32}
                  height={32}
                  alt={user.username || 'Profile'}
                  className="w-8 h-8 rounded-full object-cover border border-white/30"
                />
                <div>
                  <p className="font-medium text-white">{user.username || user.email}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

FollowList.displayName = 'FollowList';

const ProfileStats = memo(({ stats, followersPreview, followingPreview, onFollowersClick, onFollowingClick, isOwnProfile, isFollowing }) => {
  return (
    <div className="space-y-4">
      {/* Followers */}
      <div 
        className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
        onClick={() => isOwnProfile || isFollowing ? onFollowersClick() : toast.error('Follow to see followers')}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-200">Followers</span>
          <span className="text-white font-bold">{stats?.followerCounts || 0}</span>
        </div>
        <div className="flex -space-x-2">
          {followersPreview.slice(0, 5).map((follower, index) => (
            <Image
              key={follower.id}
              src={follower.avatarUrl || follower.image || '/img/profile.png'}
              width={32}
              height={32}
              alt={follower.username}
              className="w-8 h-8 rounded-full border-2 border-white/30 object-cover"
              style={{ zIndex: 5 - index }}
            />
          ))}
          {followersPreview.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
              +{followersPreview.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Following */}
      <div 
        className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
        onClick={() => isOwnProfile || isFollowing ? onFollowingClick() : toast.error('Follow to see following')}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-200">Following</span>
          <span className="text-white font-bold">{stats?.followingCounts || 0}</span>
        </div>
        <div className="flex -space-x-2">
          {followingPreview.slice(0, 5).map((follow, index) => (
            <Image
              key={follow.id}
              src={follow.avatarUrl || follow.image || '/img/profile.png'}
              width={32}
              height={32}
              alt={follow.username}
              className="w-8 h-8 rounded-full border-2 border-white/30 object-cover"
              style={{ zIndex: 5 - index }}
            />
          ))}
          {followingPreview.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
              +{followingPreview.length - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ProfileStats.displayName = 'ProfileStats';

const TabNavigation = memo(({ activeTab, onTabChange }) => (
  <div className="flex gap-4 mb-8">
    <button
      onClick={() => onTabChange('reviews')}
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all border ${
        activeTab === 'reviews'
          ? 'bg-white text-black border-white shadow-lg font-medium'
          : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
      }`}
    >
      <MdLocalMovies size={20} />
      <span className="font-medium">Reviews</span>
    </button>
    <button
      onClick={() => onTabChange('blogs')}
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all border ${
        activeTab === 'blogs'
          ? 'bg-white text-black border-white shadow-lg font-medium'
          : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
      }`}
    >
      <MdArticle size={20} />
      <span className="font-medium">Stories</span>
    </button>
  </div>
));

TabNavigation.displayName = 'TabNavigation';
// ===== END MEMOIZED COMPONENTS =====

// ===== LOADING & ERROR STATES =====
const LoadingSkeleton = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-700 to-yellow-900">
    <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-6 w-full p-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-[30rem] w-[30rem] rounded-xl bg-gray-700/50 border border-white/10" />
      ))}
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-700 to-yellow-900 flex items-center justify-center">
    <div className="text-center text-white">
      <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
      <p className="mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors mr-4"
      >
        Try Again
      </button>
      <Link 
        href="/" 
        className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  </div>
);
// ===== END LOADING & ERROR STATES =====

// ===== MAIN COMPONENT =====
export default function UserProfilePage({ params }) {
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const { id } = params;
  const isOwnProfile = session?.user?.id === id;

  // Memoized values to prevent recalculations on every render
  const memoizedProfileData = useMemo(() => state.profileData, [state.profileData]);
  const memoizedUserData = useMemo(() => memoizedProfileData?.user || {}, [memoizedProfileData]);
  const memoizedStats = useMemo(() => memoizedProfileData?.stats || {}, [memoizedProfileData]);
  const memoizedFollowersPreview = useMemo(() => memoizedProfileData?.followers?.preview || [], [memoizedProfileData]);
  const memoizedFollowingPreview = useMemo(() => memoizedProfileData?.following?.preview || [], [memoizedProfileData]);

  // Single API call to fetch all profile data
  const fetchProfileData = useMemo(() => async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch(`/api/profile/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const data = await response.json();
      dispatch({ type: 'SET_PROFILE_DATA', payload: data });
      
    } catch (err) {
      console.error('Error fetching profile data:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
      toast.error(err.message || 'Failed to load profile data');
    }
  }, [id]);

  // Fetch follow status separately if not own profile
  const fetchFollowStatus = useMemo(() => async () => {
    if (isOwnProfile || !session) {
      dispatch({ type: 'SET_FOLLOW_STATUS', payload: false });
      return;
    }
    
    try {
      const response = await fetch(`/api/follow/${id}`);
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_FOLLOW_STATUS', payload: data.isFollowing });
      }
    } catch (error) {
      console.error('Error fetching follow status:', error);
    }
  }, [id, isOwnProfile, session]);

  const handleFollow = async () => {
    if (!session) {
      toast.error('Please login to follow users');
      return;
    }
  
    try {
      const method = state.isFollowing ? 'DELETE' : 'POST';
      const response = await fetch('/api/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: id })
      });
  
      if (!response.ok) throw new Error('Failed to update follow status');
  
      if (!state.isFollowing) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'FOLLOW',
            toUserId: id,
          })
        });
      }
  
      // Update follow status AND increment/decrement follower count
      dispatch({ type: 'SET_FOLLOW_STATUS', payload: !state.isFollowing });
      dispatch({ type: 'UPDATE_FOLLOW_COUNTS', payload: { isFollowing: !state.isFollowing } });
      
      // Refresh profile data to get updated follower list
      await fetchProfileData();
      
      toast.success(state.isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Something went wrong');
    }
  };

  // Event handlers
  const handleTabChange = (tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  const handleShowFollowers = () => {
    dispatch({ type: 'TOGGLE_FOLLOWERS_MODAL', payload: true });
  };

  const handleShowFollowing = () => {
    dispatch({ type: 'TOGGLE_FOLLOWING_MODAL', payload: true });
  };

  // Effects
  useEffect(() => {
    if (id && status !== 'loading') {
      Promise.all([
        fetchProfileData(),
        fetchFollowStatus()
      ]);
    }
  }, [id, status, fetchProfileData, fetchFollowStatus]);

  // Loading and Error States
  if (state.loading || status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (state.error || !memoizedProfileData) {
    return (
      <ErrorState 
        message={state.error || "User not found"} 
        onRetry={fetchProfileData}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900 p-6 pt-20 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Glassmorphism Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-6 shadow-2xl">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <Image
                    className="rounded-full w-24 h-24 object-cover border-4 border-white/30 shadow-2xl"
                    src={memoizedUserData.avatarUrl || memoizedUserData.image || '/img/profile.png'}
                    width={96}
                    height={96}
                    alt="Profile Image"
                    priority
                  />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  {memoizedUserData.username || memoizedUserData.name || memoizedUserData.email}
                </h2>
                
                <p className="text-gray-200 text-sm mb-4">
                  {memoizedUserData.bio || "Share your cinematic journey..."}
                </p>

                {memoizedUserData.movieGenres?.length > 0 && (
                  <div className='flex flex-wrap justify-center gap-2 mb-4'>
                    {memoizedUserData.movieGenres.map((genre, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-white/20 text-white rounded-full text-xs border border-white/30 font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {isOwnProfile ? (
                  <button 
                    onClick={() => dispatch({ type: 'TOGGLE_EDIT_PROFILE', payload: true })}
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-lg transition-all border border-white/30 hover:border-white/40 flex items-center justify-center gap-2"
                  >
                    <MdEdit size={18} />
                    Edit Profile
                  </button>
                ) : session && (
                  <button
                    onClick={handleFollow}
                    className={`w-full font-semibold py-2 rounded-lg transition-all border flex items-center justify-center gap-2
                      ${state.isFollowing 
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/30' 
                        : 'bg-white hover:bg-white/90 text-black border-white'}`
                    }
                  >
                    {state.isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Blogs</span>
                  <span className="text-white font-bold">{memoizedStats.blogCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Reviews</span>
                  <span className="text-white font-bold">{memoizedStats.reviewCount || 0}</span>
                </div>
              </div>

              {/* Follow Section */}
              <ProfileStats 
                stats={memoizedStats}
                followersPreview={memoizedFollowersPreview}
                followingPreview={memoizedFollowingPreview}
                onFollowersClick={handleShowFollowers}
                onFollowingClick={handleShowFollowing}
                isOwnProfile={isOwnProfile}
                isFollowing={state.isFollowing}
              />
            </div>
          </div>

          {/* Right Content - Polaroid Grid */}
          <div className="lg:col-span-3">
            <TabNavigation 
              activeTab={state.activeTab} 
              onTabChange={handleTabChange}
            />

            {/* Content Area with Suspense */}
            <div className="bg-transparent rounded-2xl">
              <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              }>
                {state.activeTab === 'blogs' ? 
                  <UserBlogs id={id} /> : 
                  <UserReviews id={id} />
                }
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Modals with Suspense */}
      <Suspense fallback={null}>
        {state.showEditProfile && (
          <div className='fixed inset-0 bg-black/90 p-3 z-50'>
            <EditProfile 
              userId={id} 
              onClose={() => dispatch({ type: 'TOGGLE_EDIT_PROFILE', payload: false })} 
            />
          </div>
        )}
      </Suspense>

      {state.showFollowers && (
        <FollowList 
          type="Followers" 
          data={memoizedFollowersPreview}
          onClose={() => dispatch({ type: 'TOGGLE_FOLLOWERS_MODAL', payload: false })}
        />
      )}

      {state.showFollowing && (
        <FollowList 
          type="Following" 
          data={memoizedFollowingPreview}
          onClose={() => dispatch({ type: 'TOGGLE_FOLLOWING_MODAL', payload: false })}
        />
      )}
    </>
  );
}