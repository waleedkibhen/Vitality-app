/**
 * VideoPlayer.jsx — Refactored
 * Flat, sharp-edged video player.
 * - Pure black (#000000) background
 * - No padding, no border radius beyond rounded-sm
 * - play/pause on click
 * - Film-strip grid placeholder
 */

import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

/** Aspect ratio → CSS padding-bottom % */
function paddingForRatio(ratio) {
  if (ratio === '9/16') return '177.78%'
  if (ratio === '1/1')  return '100%'
  return '56.25%' // 16/9 default
}

export default function VideoPlayer({ videoId, videoSrc, aspectRatio = '16/9', title }) {
  const videoRef = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [hovering, setHovering] = useState(false)

  const toggle = () => {
    if (!videoSrc) return
    if (playing) {
      videoRef.current?.pause()
      setPlaying(false)
    } else {
      videoRef.current?.play()
      setPlaying(true)
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-black cursor-pointer"
      style={{ paddingBottom: paddingForRatio(aspectRatio) }}
      onClick={toggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      role="button"
      aria-label={videoSrc ? (playing ? 'Pause video' : 'Play video') : 'Video placeholder'}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          preload="metadata"
          aria-label={title}
        />
      ) : (
        /* Placeholder */
        <div className="absolute inset-0 bg-[#0A0A0A] flex items-center justify-center">
          {/* Subtle scan-line grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden="true"
          />
          {/* Center icon */}
          <div className="relative flex flex-col items-center gap-2 pointer-events-none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.25" strokeLinecap="square" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20"/>
              <line x1="2"  y1="8"  x2="22" y2="8"/>
              <line x1="2"  y1="16" x2="22" y2="16"/>
              <line x1="8"  y1="2"  x2="8"  y2="8"/>
              <line x1="16" y1="2"  x2="16" y2="8"/>
              <line x1="8"  y1="16" x2="8"  y2="22"/>
              <line x1="16" y1="16" x2="16" y2="22"/>
            </svg>
          </div>
        </div>
      )}

      {/* Play / Pause overlay */}
      {videoSrc && (
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${hovering ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <div className="w-10 h-10 flex items-center justify-center bg-black/60">
            {playing
              ? <Pause size={15} className="text-white" fill="white" />
              : <Play  size={15} className="text-white" fill="white" style={{ marginLeft: 2 }} />
            }
          </div>
        </div>
      )}
    </div>
  )
}
