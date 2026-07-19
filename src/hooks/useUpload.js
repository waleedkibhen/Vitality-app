import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'
import toast from 'react-hot-toast'

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB
const MAX_DURATION_SEC = 60 // 60 seconds limit for clippers

export async function uploadToCloudinary(file, caption, user) {
  const toastId = toast.loading('Uploading video... 0%')
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    
    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration missing in .env.local")
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, 
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (percentCompleted < 100) {
            toast.loading(`Uploading video... ${percentCompleted}%`, { id: toastId })
          } else {
            toast.loading(`Finalizing upload...`, { id: toastId })
          }
        }
      }
    )
    
    const secureUrl = res.data.secure_url
    const publicId = res.data.public_id
    
    if (!secureUrl) throw new Error("Failed to get secure URL from Cloudinary")

    // Use raw secureUrl directly as requested (no q_auto/f_mp4 processing)
    const docRef = await addDoc(collection(db, 'posts'), {
      videoUrl: secureUrl,
      cloudinaryPublicId: publicId,
      caption: caption,
      status: 'approved',
      ratingSum: 0,
      ratingCount: 0,
      viewCount: 0,
      author: user ? {
        username: user.username,
        profilePicUrl: user.profilePicUrl,
        name: user.name || user.username
      } : null,
      createdAt: serverTimestamp()
    })

    toast.success('Video published instantly!', { id: toastId })

    return true
  } catch (err) {
    console.error("Cloudinary/Firebase Upload Error:", err)
    toast.error(err.response?.data?.error?.message || err.message || "Upload failed", { id: toastId })
    throw new Error(err.response?.data?.error?.message || err.message || "Upload failed")
  }
}

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [stage, setStage]           = useState('idle')   // idle | done | error
  const [file, setFile]             = useState(null)
  const [error, setError]           = useState(null)
  
  const dragCounterRef = useRef(0)

  const validateFile = async (f) => {
    const isVideoMime = f.type && f.type.startsWith('video/')
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.ogg', '.mpeg', '.3gp']
    const hasValidExt = validExtensions.some(ext => f.name.toLowerCase().endsWith(ext))

    if (f.type === 'video/webm' || f.name.toLowerCase().endsWith('.webm')) {
      return 'WebM format is not supported. Please upload an MP4 or MOV file.'
    }

    if (!isVideoMime && !hasValidExt) {
      return 'Only video files are accepted (MP4, MOV, AVI...)'
    }
    if (f.size > MAX_SIZE_BYTES) {
      return 'File exceeds 100 MB limit. Please compress it before uploading.'
    }
    
    // Check duration asynchronously
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        if (video.duration > MAX_DURATION_SEC) {
          resolve('Video exceeds 60 seconds limit. Short-form clips only.')
        } else {
          resolve(null)
        }
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        resolve('Invalid or corrupted video file.')
      }
      video.src = URL.createObjectURL(f)
    })
  }

  const processFile = useCallback(async (f) => {
    const err = await validateFile(f)
    if (err) {
      setError(err)
      setStage('error')
      return
    }

    setFile(f) // Show original file in preview
    setStage('done') // Ready for post
  }, [])

  const reset = useCallback(() => {
    setStage('idle')
    setFile(null)
    setError(null)
    setIsDragging(false)
    dragCounterRef.current = 0
  }, [])

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onDragEnter = useCallback((e) => {
    e.preventDefault()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) setIsDragging(true)
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) processFile(dropped)
  }, [processFile])

  const onFileInput = useCallback((e) => {
    const chosen = e.target.files?.[0]
    if (chosen) processFile(chosen)
  }, [processFile])

  return {
    isDragging,
    stage,
    file,
    error,
    reset,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInput,
  }
}
