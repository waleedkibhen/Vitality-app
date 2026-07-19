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

import { memo, useState, useRef, useEffect } from 'react'
import VideoPlayer      from './VideoPlayer'
import RatingScale      from './RatingScale'
import CommentsSection  from './CommentsSection'
import { MoreHorizontal, BarChart2, Flag, X } from 'lucide-react'
import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

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
function StatsRow({ ratings, viewCount }) {
  const score = avg(ratings)
  
  return (
    <div className="post-indent flex items-center gap-3 py-1.5">
      <BarChart2 size={12} className="text-[#333333]" aria-hidden="true" />
      <span className="text-[#555555] text-[11px]" style={{ letterSpacing: 'var(--letter-spacing-3)' }}>
        {ratings?.length > 0 ? (
          <>
            Avg&nbsp;
            <span className="text-[#FA4616] font-semibold tabular">{score}</span>
            <span className="text-[#333333]">/10</span>
            &nbsp;·&nbsp;
            <span className="tabular">{ratings.length}</span>
            &nbsp;{ratings.length === 1 ? 'rating' : 'ratings'}
          </>
        ) : (
          <span>No ratings yet</span>
        )}
        {viewCount > 0 && (
          <>
            &nbsp;·&nbsp;
            <span className="tabular">{viewCount}</span>
            &nbsp;{viewCount === 1 ? 'view' : 'views'}
          </>
        )}
      </span>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
const VideoCard = memo(function VideoCard({ video, onRate, onComment }) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  
  const articleRef = useRef(null)
  const hasViewed = useRef(false)

  // Intersection Observer for View Tracking
  useEffect(() => {
    if (!articleRef.current || hasViewed.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !hasViewed.current) {
          hasViewed.current = true
          // Wait 1 second before counting the view to ensure they actually watched it
          setTimeout(() => {
            if (articleRef.current && video.id) {
              const postRef = doc(db, 'posts', video.id)
              updateDoc(postRef, { viewCount: increment(1) }).catch(console.error)
            }
          }, 1000)
        }
      },
      { threshold: 0.6 } // Video must be 60% visible
    )

    observer.observe(articleRef.current)
    return () => observer.disconnect()
  }, [video.id])

  const handleReport = async () => {
    if (!user) {
      toast.error('You must be logged in to report a post.')
      return
    }
    if (!reportReason) {
      toast.error('Please select a reason.')
      return
    }

    setIsReporting(true)
    try {
      // Add report to subcollection
      const reportRef = doc(db, 'posts', video.id, 'reports', user.uid)
      await setDoc(reportRef, {
        reason: reportReason,
        reportedBy: user.uid,
        createdAt: serverTimestamp()
      })
      toast.success('Report submitted successfully.')
      setReportModalOpen(false)
      setMenuOpen(false)
    } catch (error) {
      console.error('Report error:', error)
      toast.error('Failed to submit report.')
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <article
      ref={articleRef}
      id={`post-${video.id}`}
      className="border-b border-[#1A1A1A] py-3 animate-fade-in relative"
      aria-label={`Post: ${video.title || 'Video'}`}
    >
      {/* ── Header row ────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 mb-2.5 relative">

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold text-[#555555] tracking-wider">
            {video.author?.name ? video.author.name.charAt(0).toUpperCase() : video.uploaderInitials || '?'}
          </span>
        </div>

        {/* Name + handle + time — all inline */}
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5 flex-wrap pt-0.5">
          <span
            className="text-white font-semibold text-[14px] leading-tight truncate"
            style={{ letterSpacing: 'var(--letter-spacing-2)' }}
          >
            {video.author?.name || video.uploader || 'Unknown'}
          </span>
          <span
            className="text-[#555555] text-[13px] truncate"
            style={{ letterSpacing: 'var(--letter-spacing-1)' }}
          >
            @{video.author?.username || video.uploader?.toLowerCase().replace(/\s+/g, '') || 'user'}
          </span>
          <span className="text-[#333333] text-[12px]">·</span>
          <time
            className="text-[#555555] text-[12px] shrink-0"
            dateTime={video.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()}
          >
            {fmtTime(video.createdAt?.toDate?.() || new Date())}
          </time>
        </div>

        {/* Report Button Explicitly Visible */}
        <button
          onClick={() => setReportModalOpen(true)}
          className="text-[#555555] hover:text-[#ff4444] transition-colors p-1 shrink-0 flex items-center gap-1.5"
          aria-label="Report Post"
          title="Report this post"
        >
          <Flag size={15} />
        </button>
      </div>

      {/* ── Post text (if any, indented to avatar right edge) */}
      {video.caption && (
        <p
          className="post-indent px-4 text-[14px] text-white leading-[1.55] mb-2.5"
          style={{ letterSpacing: 'var(--letter-spacing-1)' }}
        >
          {video.caption}
        </p>
      )}

      {/* ── Video Player — full column width ──────────── */}
      <div className="post-indent pr-0 pl-[52px]">
        <VideoPlayer
          videoId={video.id}
          videoSrc={video.videoUrl}
          aspectRatio={9/16}
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
        <StatsRow ratings={video.ratings} viewCount={video.viewCount} />
      </div>

      {/* ── Comments section ──────────────────────────── */}
      <div className="px-4 mt-0.5">
        <CommentsSection
          videoId={video.id}
          comments={video.comments}
          onComment={onComment}
        />
      </div>

      {/* ── Report Modal ──────────────────────────────── */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[320px] bg-[#111] border border-[#333] rounded-2xl p-5 shadow-2xl relative">
            <button 
              onClick={() => setReportModalOpen(false)}
              className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-white text-[16px] font-semibold mb-1" style={{ fontWeight: 400 }}>Report Post</h3>
            <p className="text-[#888] text-[13px] mb-4">Why are you reporting this video?</p>
            
            <div className="flex flex-col gap-2 mb-5">
              {['Scam/Fraud', 'Inappropriate', 'Spam', 'Other'].map(reason => (
                <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-[#222] hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-white w-4 h-4"
                  />
                  <span className="text-[#eee] text-[13px]">{reason}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleReport}
              disabled={isReporting || !reportReason}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              style={{ fontWeight: 400 }}
            >
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
})

export default VideoCard
