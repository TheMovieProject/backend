// components/PostCard.jsx
import { Image, MessageCircle, Heart, Share2 } from "lucide-react";

export default function PostCard({ item, size = "normal", isInteractive = false }) {
  const isLarge = size === "large";
  
  // Handle different post types
  const renderContent = () => {
    if (item.type === "image" && item.images && item.images.length > 0) {
      return (
        <div className={`relative ${isLarge ? 'h-96' : 'h-64'} w-full overflow-hidden rounded-xl`}>
          <img
            src={item.images[0]}
            alt={item.caption || "Post image"}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          {item.images.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-white text-sm">
              {item.images.length}
            </div>
          )}
        </div>
      );
    } 

    // Text-only posts
    if (item.type === "text" || !item.images) {
      return (
        <div className={`${isLarge ? 'min-h-80' : 'min-h-64'} w-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-center`}>
          <div className="text-center">
            <div className="text-white text-lg font-semibold line-clamp-3 mb-2">
              {item.title || item.caption}
            </div>
            {item.content && (
              <p className="text-white/70 text-sm line-clamp-4">
                {item.content}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Mixed content posts
    return (
      <div className={`${isLarge ? 'min-h-80' : 'min-h-64'} w-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl overflow-hidden`}>
        {item.images && item.images.length > 0 && (
          <div className={`${isLarge ? 'h-48' : 'h-32'} w-full overflow-hidden`}>
            <img
              src={item.images[0]}
              alt={item.caption || "Post image"}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="text-white font-semibold line-clamp-2 mb-2">
            {item.title || item.caption}
          </div>
          {item.content && (
            <p className="text-white/70 text-sm line-clamp-3">
              {item.content}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${
      isInteractive ? 'hover:bg-white/10 hover:border-white/20' : ''
    }`}>
      {/* User info */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.author?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <div className="text-white font-medium text-sm">{item.author || "Unknown User"}</div>
            <div className="text-white/50 text-xs">{item.timestamp || "2d ago"}</div>
          </div>
          <button className="text-white/50 hover:text-white transition-colors">
            •••
          </button>
        </div>
      </div>

      {/* Main content */}
      {renderContent()}

      {/* Caption */}
      {item.caption && (
        <div className="p-4 pt-3">
          <p className="text-white text-sm line-clamp-2">
            <span className="font-medium mr-2">{item.author}</span>
            {item.caption}
          </p>
        </div>
      )}

      {/* Engagement stats */}
      <div className="px-4 py-3 flex items-center justify-between text-white/50 text-sm border-t border-white/5">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 hover:text-white transition-colors">
            <Heart className="w-4 h-4" />
            <span>{item.likes || 0}</span>
          </button>
          <button className="flex items-center gap-1 hover:text-white transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>{item.comments || 0}</span>
          </button>
        </div>
        <button className="hover:text-white transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}