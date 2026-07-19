/**
 * VideoFeed.jsx — Refactored
 * Plain vertical list. No wrapper cards, no gaps, no backgrounds.
 * Each post is self-separated by its own border-b.
 */

import VideoCard from './VideoCard'
import { Video } from 'lucide-react'

export default function VideoFeed({ videos, onRate, onComment }) {
  if (!videos?.length) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-3"
        role="status"
        aria-label="No posts yet"
      >
        <Video size={22} className="text-[#222222]" strokeWidth={1.25} aria-hidden="true" />
        <p className="text-[#333333] text-[13px]" style={{ letterSpacing: 'var(--letter-spacing-3)' }}>
          No videos yet — post the first one above.
        </p>
      </div>
    )
  }

  return (
    <div role="list" aria-label="Video posts">
      {videos.map((video, i) => (
        <div
          key={video.id}
          role="listitem"
          style={{ animationDelay: `${Math.min(i * 35, 180)}ms` }}
        >
          <VideoCard
            video={video}
            onRate={onRate}
            onComment={onComment}
          />
        </div>
      ))}
    </div>
  )
}
