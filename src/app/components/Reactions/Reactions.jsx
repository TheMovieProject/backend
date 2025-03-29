"use client"

const Reaction = ({ reviewId, emojis, likes, fire, onReact, className }) => {
  const handleLike = () => {
    onReact(reviewId, "like")
  }

  const handleFire = () => {
    onReact(reviewId, "fire")
  }

  const handleEmoji = (emojiType) => {
    onReact(reviewId, emojiType)
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button onClick={handleLike} className="flex items-center gap-1 hover:text-blue-600 transition duration-200">
        👍 {likes || 0}
      </button>
      <button onClick={handleFire} className="flex items-center gap-1 hover:text-red-600 transition duration-200">
        🔥 {fire || 0}
      </button>
    </div>
  )
}

export default Reaction


