/**
 * UploadZone.jsx
 * Persistent drag-and-drop upload panel pinned at the top of the feed.
 *
 * States:
 *   idle       — default dashed dropzone
 *   dragging   — highlighted dashed border
 *   processing — sharp Vermilion progress bar
 *   done       — success row + "Add to Feed" form
 *   error      — error message with retry
 */

import { useRef, useState } from 'react'
import { UploadCloud, Film, CheckSquare, X, RotateCcw } from 'lucide-react'
import { useUpload } from '../hooks/useUpload'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function UploadZone({ onVideoAdded }) {
  const fileInputRef = useRef(null)
  const [title, setTitle]           = useState('')
  const [aspectRatio, setAspectRatio] = useState('16/9')
  const [submitted, setSubmitted]   = useState(false)

  const handleComplete = (file) => {
    // File processed — show the metadata form
  }

  const {
    isDragging, stage, progress, file, error,
    reset, onDragEnter, onDragOver, onDragLeave, onDrop, onFileInput,
  } = useUpload(handleComplete)

  const handleAddToFeed = () => {
    if (!file) return
    onVideoAdded(file, title, aspectRatio)
    setTitle('')
    setAspectRatio('16/9')
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      reset()
    }, 1800)
  }

  // ── IDLE / DRAGGING ────────────────────────────────────────────────────────
  if (stage === 'idle' || stage === 'error') {
    const isDrag = isDragging
    return (
      <section
        id="upload-zone"
        className="w-full"
        aria-label="Upload zone"
      >
        <div
          role="region"
          aria-label="Drag and drop area"
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'relative w-full h-28 flex flex-col items-center justify-center gap-2',
            'border border-dashed cursor-pointer select-none',
            'bg-brand-surface transition-colors duration-100',
            isDrag
              ? 'border-brand-accent bg-[#1a0d08]'
              : 'border-brand-dust hover:border-brand-text',
          ].join(' ')}
        >
          {/* Drag overlay label */}
          {isDrag && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(250,70,22,0.06)] pointer-events-none">
              <span className="text-brand-accent text-sm font-semibold tracking-tight">
                Release to upload
              </span>
            </div>
          )}

          {!isDrag && (
            <>
              <UploadCloud
                size={22}
                className="text-brand-dust"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-brand-text text-sm font-medium tracking-tight text-center">
                Drag &amp; Drop Video to Predict Virality
              </p>
              <p className="text-brand-dust text-xs">
                MP4 · MOV · AVI · WebM · Max 500 MB
              </p>
            </>
          )}
        </div>

        {stage === 'error' && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#1a0808] border-x border-b border-[#3a1010]">
            <p className="text-[#ef4444] text-xs font-medium">{error}</p>
            <button
              onClick={(e) => { e.stopPropagation(); reset() }}
              className="text-brand-dust hover:text-brand-text transition-colors"
              aria-label="Clear error and retry"
            >
              <RotateCcw size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          aria-label="Choose video file"
          onChange={onFileInput}
        />
      </section>
    )
  }

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <section
        id="upload-zone-processing"
        className="w-full bg-brand-surface border border-[#1f1f1f]"
        aria-label="Upload progress"
      >
        {/* File row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
          <Film size={16} className="text-brand-accent shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-brand-text text-xs font-semibold truncate">{file?.name}</p>
            <p className="text-brand-dust text-[10px] mt-0.5">
              {formatBytes(file?.size ?? 0)}
            </p>
          </div>
          <span className="text-brand-accent text-xs font-semibold tabular-nums">
            {progress}%
          </span>
        </div>

        {/* Vermilion progress bar — sharp, no radius */}
        <div className="w-full h-0.5 bg-[#1f1f1f]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-brand-accent transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="px-4 py-2 text-brand-dust text-[10px] font-medium uppercase tracking-widest">
          Processing…
        </p>
      </section>
    )
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (stage === 'done') {
    if (submitted) {
      return (
        <section
          id="upload-zone-done"
          className="w-full flex items-center justify-center gap-2 h-16 bg-brand-surface border border-[#1f1f1f]"
        >
          <CheckSquare size={15} className="text-brand-accent" aria-hidden="true" />
          <span className="text-brand-text text-sm font-semibold">Added to feed</span>
        </section>
      )
    }

    return (
      <section
        id="upload-zone-form"
        className="w-full bg-brand-surface border border-[#1f1f1f]"
        aria-label="Upload details"
      >
        {/* File confirmation row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <CheckSquare size={14} className="text-brand-accent shrink-0" aria-hidden="true" />
            <span className="text-brand-text text-xs font-semibold truncate max-w-[240px]">
              {file?.name}
            </span>
          </div>
          <button
            onClick={reset}
            className="text-brand-dust hover:text-brand-text transition-colors p-0.5"
            aria-label="Remove file"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>

        {/* Metadata form */}
        <div className="px-4 py-3 flex flex-col gap-2.5">
          <div className="flex gap-2">
            {/* Title */}
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title (optional)…"
              maxLength={80}
              className="flex-1 h-8 px-3 bg-black border border-[#1f1f1f] text-brand-text text-xs font-medium placeholder:text-[#3a3a3a] focus:border-brand-dust outline-none transition-colors"
              aria-label="Video title"
            />
            {/* Aspect Ratio */}
            <select
              id="upload-aspect"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="h-8 px-2 bg-black border border-[#1f1f1f] text-brand-dust text-xs font-medium outline-none focus:border-brand-dust transition-colors appearance-none cursor-pointer min-w-[72px]"
              aria-label="Aspect ratio"
            >
              <option value="16/9">16:9</option>
              <option value="9/16">9:16</option>
              <option value="1/1">1:1</option>
            </select>
          </div>

          <button
            id="upload-submit-btn"
            onClick={handleAddToFeed}
            className="w-full h-8 bg-brand-accent text-white text-xs font-semibold tracking-wide hover:bg-[#e03a0e] transition-colors duration-100"
          >
            Add to Feed
          </button>
        </div>
      </section>
    )
  }

  return null
}
