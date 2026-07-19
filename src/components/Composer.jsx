/**
 * Composer.jsx
 * 
 * - Replaced input with contentEditable div to support real visual formatting.
 * - Placeholder picks a random string ONCE per refresh.
 * - Formatting options moved to the left, Attach video moved next to Post button.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Video, X, CheckCircle2, Bold, Italic, Underline, List } from 'lucide-react'
import { useUpload, uploadToCloudinary } from '../hooks/useUpload'
import { useAuth } from '../context/AuthContext'

/* ─── Helpers ────────────────────────────────────────────── */
function formatBytes(b) {
  if (!b) return ''
  const k = 1024
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(1)} ${'BKMG'[i]}B`
}

const PLACEHOLDERS = [
  "Describe your video...",
  "What feedback are you looking for?",
  "Give this clip some context...",
  "Tell us why this video is great...",
  "What's the hook of this video?",
]

/* ─── Light blue icon button with dark blue hover circle ─── */
function IconBtn({ onClick, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'relative w-8 h-8 flex items-center justify-center rounded-full',
        'transition-all duration-150 ease-out',
        'hover:bg-[#11254C]',
        'disabled:opacity-30 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {children}
    </button>
  )
}


/* ─── Inline video preview ────────────────────────────── */
function VideoPreview({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!previewUrl) return null

  return (
    <div
      className="mx-4 mb-3 rounded-xl overflow-hidden bg-black"
      style={{ border: '1px solid #333333' }}
    >
      <video
        src={previewUrl}
        className="w-full block bg-black"
        style={{ maxHeight: '50vh', objectFit: 'contain' }}
        controls
        playsInline
        preload="metadata"
        aria-label="Video preview"
      />

      <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0a] border-t border-[#333333]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} style={{ color: '#88B5FF' }} />
          <span className="text-[11px] font-medium" style={{ color: '#88B5FF', letterSpacing: 'var(--letter-spacing-3)' }}>
            Preview
          </span>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-[#555] hover:text-white transition-colors text-[11px]"
          aria-label="Remove video"
        >
          <X size={11} /> Remove
        </button>
      </div>
    </div>
  )
}

/* ─── Main Composer ──────────────────────────────────────── */
export default function Composer({ setPendingUpload }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const textRef      = useRef(null)

  const [text, setText]           = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Pick placeholder ONCE on mount
  const [currentPlaceholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  )

  const { stage, file, error, reset, onFileInput } = useUpload()

  const MAX_CHARS = 600
  
  const handleKeyDown = (e) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Control', 'Alt', 'Meta', 'Shift'
    ]
    if (e.ctrlKey || e.metaKey) return

    if (text.length >= MAX_CHARS && !allowedKeys.includes(e.key)) {
      const selection = window.getSelection()
      // Block typing if there's no active text selection
      if (!selection || selection.toString().length === 0) {
        e.preventDefault()
      }
    }
  }

  const isReady     = stage === 'done'
  const isError     = stage === 'error'
  // We use the raw textContent length to determine if we can post
  const canPost     = isReady && text.trim().length > 0 && text.length <= MAX_CHARS

  const handlePost = async () => {
    if (!canPost || isProcessing) return
    
    setIsProcessing(true)
    const caption = textRef.current.innerHTML
    const fileToUpload = file
    
    setPendingUpload(true)
    try {
      await uploadToCloudinary(fileToUpload, caption, user)
      // Only reset composer state after successful upload/document creation
      if (textRef.current) textRef.current.innerHTML = ''
      setText('')
      reset()
    } catch (err) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setPendingUpload(false)
    }
  }

  // Native contentEditable formatting
  const applyFormat = (command) => {
    document.execCommand(command, false, null)
    if (textRef.current) {
      textRef.current.focus()
      setText(textRef.current.textContent)
    }
  }

  // Handle manual input in the contentEditable
  const handleInput = (e) => {
    // contentEditable doesn't enforce maxLength natively, so we capture the current length.
    // If they paste, it might exceed, but canPost will disable the Post button.
    setText(e.currentTarget.textContent)
  }

  return (
    <div className="w-full">
      <style>{`
        /* Native placeholder for contentEditable */
        #composer-text:empty::before {
          content: attr(data-placeholder);
          color: #555555;
          pointer-events: none;
        }
        
        /* Ensure bullet lists render decently in the editor */
        #composer-text ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        #composer-text b {
          font-weight: 700;
          color: #ffffff;
        }
        #composer-text i {
          font-style: italic;
        }
      `}</style>

      <div
        className="rounded-2xl bg-[#111111] overflow-hidden relative pb-3"
        style={{
          border: '1px solid #333333',
          boxShadow: '0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        role="region"
        aria-label="Video post composer"
      >

        {/* ── Row 1: Avatar + Text Input ────────────────────── */}
        <div
          className="flex items-start gap-4 px-4 pt-4 pb-4 cursor-text"
          onClick={() => textRef.current?.focus()}
        >

          {/* contentEditable div for true visual formatting */}
          <div
            ref={textRef}
            id="composer-text"
            contentEditable={true}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={currentPlaceholder}
            aria-label="Post text"
            className="flex-1 bg-transparent border-none outline-none text-[#F1F1F1] text-[15px] font-normal leading-relaxed pt-2 min-h-[40px] break-words"
            style={{ caretColor: '#ffffff' }}
          />
        </div>

        {/* ── Video preview ─────────────────────────── */}
        {isReady && <VideoPreview file={file} onRemove={reset} />}

        {/* ── Error state ───────────────────────────── */}
        {isError && (
          <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-950/30 border border-red-900/40">
            <p className="text-red-400 text-xs flex-1 font-medium">
              {error || 'An error occurred.'}
            </p>
            <button onClick={reset} className="text-red-500 hover:text-red-300 transition-colors shrink-0" aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Action bar ───────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-1">

          {/* LEFT SIDE: Formatting Options */}
          <div className="flex items-center gap-1.5">
            {/* Note: onMouseDown with preventDefault stops the div from losing focus when clicking a format button */}
            <button 
              onMouseDown={(e) => { e.preventDefault(); applyFormat('bold') }}
              className="text-[#555555] hover:text-[#F1F1F1] p-1.5 transition-colors rounded-md hover:bg-[#1a1a1a]" 
              title="Bold"
            >
              <Bold size={16} strokeWidth={2.5} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); applyFormat('italic') }}
              className="text-[#555555] hover:text-[#F1F1F1] p-1.5 transition-colors rounded-md hover:bg-[#1a1a1a]" 
              title="Italic"
            >
              <Italic size={16} strokeWidth={2.5} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); applyFormat('underline') }}
              className="text-[#555555] hover:text-[#F1F1F1] p-1.5 transition-colors rounded-md hover:bg-[#1a1a1a]" 
              title="Underline"
            >
              <Underline size={16} strokeWidth={2.5} />
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList') }}
              className="text-[#555555] hover:text-[#F1F1F1] p-1.5 transition-colors rounded-md hover:bg-[#1a1a1a]" 
              title="Bullet List"
            >
              <List size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* RIGHT SIDE: Char counter + Attach Video + Post Button */}
          <div className="flex items-center gap-4">
            
            {/* Show character counter only when getting close to limit (within 100 chars) */}
            {text.length > MAX_CHARS - 100 && (
              <span
                className="text-[11px] tabular mr-[-4px]"
                style={{
                  color: text.length >= MAX_CHARS ? '#ef4444' : '#888888',
                  letterSpacing: 'var(--letter-spacing-3)',
                }}
              >
                {MAX_CHARS - text.length}
              </span>
            )}
            
            {/* Attach Icon */}
            <IconBtn
              onClick={() => fileInputRef.current?.click()}
              disabled={isReady}
              label={isReady ? 'Video attached' : 'Attach a video'}
            >
              <Video
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
                style={{ color: isReady ? '#555555' : '#88B5FF' }}
              />
            </IconBtn>

            <button
              onClick={handlePost}
              disabled={!canPost || isProcessing}
              className={`
                h-8 px-5 rounded-full text-[13px] font-semibold transition-colors duration-150 ease-out
                ${(canPost && !isProcessing)
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                  : 'bg-[#1a1a1a] text-[#555] cursor-not-allowed'
                }
              `}
              style={{
                letterSpacing: 'var(--letter-spacing-4)'
              }}
            >
              {isProcessing ? 'Processing...' : 'Post'}
            </button>
          </div>

        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-m4v,video/*"
        className="hidden"
        aria-label="Choose a video file"
        onChange={onFileInput}
        onClick={(e) => { e.target.value = '' }}
      />
    </div>
  )
}
