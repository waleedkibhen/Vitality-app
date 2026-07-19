/**
 * FeedbackInput.jsx
 * Minimalist full-width comment/feedback row for each video card.
 */

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export default function FeedbackInput({ videoId, onComment }) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onComment(videoId, trimmed)
    setValue('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 border-t border-[#0f0f0f]">
      {submitted ? (
        <p className="text-brand-accent text-xs font-semibold h-8 flex items-center">
          Feedback submitted ✓
        </p>
      ) : (
        <div className="flex items-center gap-0" role="search">
          <input
            id={`feedback-${videoId}`}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Leave feedback…"
            maxLength={300}
            aria-label="Leave feedback"
            className="flex-1 h-8 px-3 bg-black border border-[#1f1f1f] border-r-0 text-brand-text text-xs font-medium placeholder:text-[#2a2a2a] focus:border-brand-dust outline-none transition-colors"
          />
          <button
            id={`feedback-submit-${videoId}`}
            onClick={handleSubmit}
            disabled={!value.trim()}
            aria-label="Submit feedback"
            className="h-8 px-3 bg-brand-accent text-white text-xs font-semibold border border-brand-accent hover:bg-[#e03a0e] disabled:bg-[#1f1f1f] disabled:border-[#1f1f1f] disabled:text-[#3a3a3a] disabled:cursor-not-allowed transition-colors duration-100 flex items-center gap-1.5"
          >
            Submit
            <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
