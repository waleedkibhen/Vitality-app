/**
 * VideoCard.jsx — Complete Rewrite
 * Whop-native timeline post. NO card container. NO heavy background.
 * Separation = 1px border-b only (#1A1A1A).
 *
 * Anatomy:
 *
 *  border-b ──────────────────────────────────────────────────
 *  [Avatar]  @handle · name · timestamp         ← header row
 *            [post body text if any]            ← text (indented)
 *            [Video Player — full column width]  ← media
 *            [1][2][3][4][5][6][7][8][9][10]    ← flat rating
 *            [avg score · N ratings]            ← stats row
 *            [comment input + thread]           ← comments
 *  border-b ──────────────────────────────────────────────────
 *
 * The "Expires in" timer is DELETED per spec.
 */

import { memo, useState } from 'react'
import VideoPlayer      from './VideoPlayer'
import RatingScale      from './RatingScale'
import CommentsSection  from './CommentsSection'
import { MoreHorizontal, BarChart2 } from 'lucide-react'

/** Calculate rounded average */
function avg(arr) {
  if (!arr?.length) return null
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
}

/** Relative timestamp formatter */
function fmtTime(dateOrStr) {
  if (typeof dateOrStr === 'string') return dateOrStr
  const diff = (Date.now() - new Date(dateOrStr)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

/* ── Stats bar (avg rating + count) ─────────────────────── */
function StatsRow({ ratings }) {
  if (!ratings?.length) return null
  const score = avg(ratings)

  return (
    <div className="post-indent flex items-center gap-3 py-1.5">
      <BarChart2 size={12} className="text-[#333333]" aria-hidden="true" />
      <span className="text-[#555555] text-[11px]" style={{ letterSpacing: 'var(--letter-spacing-3)' }}>
        Avg&nbsp;
        <span className="text-[#FA4616] font-semibold tabular">{score}</span>
        <span className="text-[#333333]">/10</span>
        &nbsp;·&nbsp;
        <span className="tabular">{ratings.length}</span>
        &nbsp;{ratings.length === 1 ? 'rating' : 'ratings'}
      </span>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
const VideoCard = memo(function VideoCard({ video, onRate, onComment }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <article
      id={`post-${video.id}`}
      className="border-b border-[#1A1A1A] py-3 animate-fade-in"
      aria-label={`Post: ${video.title}`}
    >
      {/* ── Header row ────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 mb-2.5">

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold text-[#555555] tracking-wider">
            {video.uploaderInitials}
          </span>
        </div>

        {/* Name + handle + time — all inline */}
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5 flex-wrap pt-0.5">
          <span
            className="text-white font-semibold text-[14px] leading-tight truncate"
            style={{ letterSpacing: 'var(--letter-spacing-2)' }}
          >
            {video.uploader}
          </span>
          <span
            className="text-[#555555] text-[13px] truncate"
            style={{ letterSpacing: 'var(--letter-spacing-1)' }}
          >
            @{video.uploader.toLowerCase().replace(/\s+/g, '')}
          </span>
          <span className="text-[#333333] text-[12px]">·</span>
          <time
            className="text-[#555555] text-[12px] shrink-0"
            dateTime={video.expiresAt?.toISOString?.()}
          >
            {fmtTime('2m ago')}
          </time>
        </div>

        {/* More menu */}
        <button
          className="text-[#333333] hover:text-[#555555] transition-colors p-0.5 shrink-0"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Post options"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>

      {/* ── Post text (if any, indented to avatar right edge) */}
      {video.title && (
        <p
          className="post-indent px-4 text-[14px] text-white leading-[1.55] mb-2.5"
          style={{ letterSpacing: 'var(--letter-spacing-1)' }}
        >
          {video.title}
        </p>
      )}

      {/* ── Video Player — full column width ──────────── */}
      <div className="post-indent pr-0 pl-[52px]">
        <VideoPlayer
          videoId={video.id}
          videoSrc={video.videoSrc}
          aspectRatio={video.aspectRatio}
          title={video.title}
        />
      </div>

      {/* ── Rating scale — flat row, indented ─────────── */}
      <div className="px-4 mt-2">
        <RatingScale
          videoId={video.id}
          userRating={video.userRating}
          onRate={onRate}
        />
      </div>

      {/* ── Stats row ─────────────────────────────────── */}
      <div className="px-4">
        <StatsRow ratings={video.ratings} />
      </div>

      {/* ── Comments section ──────────────────────────── */}
      <div className="px-4 mt-0.5">
        <CommentsSection
          videoId={video.id}
          comments={video.comments}
          onComment={onComment}
        />
      </div>
    </article>
  )
})

export default VideoCard
