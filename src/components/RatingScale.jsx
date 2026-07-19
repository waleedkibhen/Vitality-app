/**
 * RatingScale.jsx — Refactored
 * Flat horizontal 1–10 row sitting directly under the video player.
 * No enclosing block — rendered inline in the post body.
 *
 * Unselected: #151515 bg, 1px #222222 border, #555555 text
 * Selected:   #FA4616 bg, #FA4616 border, white text
 * Below selected: slightly warmer to show progression
 */

import { memo } from 'react'

const VALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const RatingScale = memo(function RatingScale({ videoId, userRating, onRate }) {
  return (
    <div
      className="flex items-center gap-px post-indent"
      role="group"
      aria-label="Rate this video 1 to 10"
    >
      {VALS.map((val) => {
        const isSelected = userRating === val
        const isFilled   = userRating !== null && val < userRating

        return (
          <button
            key={val}
            id={`rate-${videoId}-${val}`}
            aria-label={`Rate ${val} out of 10`}
            aria-pressed={isSelected}
            onClick={() => onRate(videoId, val)}
            className={[
              'rate-btn',
              isSelected ? 'active'  : '',
              isFilled   ? '!bg-[#1c0a04] !border-[#2a1005] !text-[#FA4616]/50' : '',
            ].filter(Boolean).join(' ')}
          >
            {val}
          </button>
        )
      })}

      {/* Score badge */}
      {userRating !== null && (
        <span className="ml-2 text-[11px] text-[#555555] tabular shrink-0">
          {userRating}/10
        </span>
      )}
    </div>
  )
})

export default RatingScale
