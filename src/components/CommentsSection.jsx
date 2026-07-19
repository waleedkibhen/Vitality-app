/**
 * CommentsSection.jsx — Refactored
 * Whop-native minimal comment thread.
 *
 * Structure:
 *   - Comment input: borderless, thin #222222 bottom border only
 *   - Each comment: small avatar (w-6 h-6) + raw text, no bubbles
 *   - Nested replies: further indented, even smaller avatar (w-5 h-5)
 *   - Separator: none — comments are just stacked raw rows
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/* ── Single comment row ──────────────────────────────────── */
function CommentRow({ comment, depth = 0 }) {
  const avatarSize = depth === 0 ? 'w-6 h-6 text-[8px]' : 'w-5 h-5 text-[7px]'
  const indent     = depth > 0 ? 'ml-8' : ''

  return (
    <div className={`flex items-start gap-2 py-1.5 ${indent} animate-fade-in`}>
      <div
        className={`${avatarSize} rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center shrink-0 mt-0.5`}
        aria-hidden="true"
      >
        <span className="font-bold text-[#555555]">{comment.initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-white text-[12px] font-semibold mr-1.5"
          style={{ letterSpacing: 'var(--letter-spacing-2)' }}>
          {comment.author}
        </span>
        <span className="text-[#555555] text-[11px]">{comment.ts}</span>
        <p className="text-[#888888] text-[13px] leading-[1.5] mt-0.5 break-words"
          style={{ letterSpacing: 'var(--letter-spacing-1)' }}>
          {comment.text}
        </p>
      </div>
    </div>
  )
}

/* ── Comment input ───────────────────────────────────────── */
function CommentInput({ videoId, onComment }) {
  const [val, setVal]         = useState('')
  const [submitted, setSub]   = useState(false)

  const submit = () => {
    const t = val.trim()
    if (!t) return
    onComment(videoId, t)
    setVal('')
    setSub(true)
    setTimeout(() => setSub(false), 1800)
  }

  if (submitted) {
    return (
      <p className="text-[#FA4616] text-[12px] py-2 post-indent"
        style={{ letterSpacing: 'var(--letter-spacing-2)' }}>
        Comment posted ✓
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2.5 post-indent py-2">
      {/* Tiny self-avatar */}
      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center shrink-0" aria-hidden="true">
        <span className="text-[7px] font-bold text-[#555555]">YU</span>
      </div>
      {/* Borderless input with only bottom border */}
      <div className="flex-1 flex items-center border-b border-[#222222]">
        <input
          id={`comment-input-${videoId}`}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a comment…"
          maxLength={300}
          aria-label="Add a comment"
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#2a2a2a] outline-none py-1"
          style={{ letterSpacing: 'var(--letter-spacing-1)' }}
        />
        {val.trim() && (
          <button
            onClick={submit}
            className="text-whop-blue text-[12px] font-semibold shrink-0 pl-2 hover:text-blue-400 transition-colors"
            aria-label="Post comment"
          >
            Post
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────── */
export default function CommentsSection({ videoId, comments = [], onComment }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? comments : comments.slice(0, 3)
  const hiddenCount = comments.length - 3

  return (
    <div className="flex flex-col">
      {/* Comment input */}
      <CommentInput videoId={videoId} onComment={onComment} />

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="post-indent flex flex-col">
          {visible.map((c) => (
            <CommentRow key={c.id} comment={c} depth={0} />
          ))}

          {/* Expand / collapse */}
          {comments.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[#555555] text-[11px] py-1.5 hover:text-[#888888] transition-colors"
              aria-expanded={expanded}
              style={{ letterSpacing: 'var(--letter-spacing-3)' }}
            >
              {expanded ? (
                <><ChevronUp size={12} aria-hidden="true" /> Hide comments</>
              ) : (
                <><ChevronDown size={12} aria-hidden="true" /> {hiddenCount} more comment{hiddenCount !== 1 ? 's' : ''}</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
