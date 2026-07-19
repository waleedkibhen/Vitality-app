/**
 * CommentsList.jsx
 * Compact collapsible comment list for VideoCard.
 * Shows 2 comments by default, expands on demand.
 */

import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

function timeAgo(ts) {
  // ts is already a pre-formatted string like "2m ago" or "just now" in our data model
  return ts
}

export default function CommentsList({ comments }) {
  const [expanded, setExpanded] = useState(false)

  if (!comments || comments.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-[#0f0f0f] flex items-center gap-2">
        <MessageSquare size={12} className="text-[#2a2a2a]" aria-hidden="true" />
        <span className="text-[#2a2a2a] text-[11px]">No feedback yet</span>
      </div>
    )
  }

  const visible = expanded ? comments : comments.slice(0, 2)
  const hasMore = comments.length > 2

  return (
    <div className="border-t border-[#0f0f0f]">
      <ul className="px-4 pt-3 flex flex-col gap-3" aria-label="Comments">
        {visible.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5 animate-fade-in">
            {/* Avatar */}
            <div className="w-5 h-5 bg-[#1f1f1f] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[8px] font-bold text-brand-dust">{c.initials}</span>
            </div>
            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-brand-text text-[11px] font-semibold">{c.author}</span>
                <span className="text-[#3a3a3a] text-[10px]">{timeAgo(c.ts)}</span>
              </div>
              <p className="text-brand-dust text-[12px] leading-relaxed mt-0.5 break-words">
                {c.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium text-brand-dust hover:text-brand-text transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} aria-hidden="true" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} aria-hidden="true" />
              {comments.length - 2} more {comments.length - 2 === 1 ? 'comment' : 'comments'}
            </>
          )}
        </button>
      )}

      {!hasMore && <div className="pb-1" />}
    </div>
  )
}
