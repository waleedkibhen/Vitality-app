import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB
const MAX_DURATION_SEC = 60 // 60 seconds limit for clippers

export async function uploadToCloudinary(file, caption, user) {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    
    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration missing in .env.local")
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, formData)
    const secureUrl = res.data.secure_url
    const publicId = res.data.public_id
    
    if (!secureUrl) throw new Error("Failed to get secure URL from Cloudinary")

    // Inject q_auto,f_mp4/ directly after /upload/ and change extension to .mp4
    const urlParts = secureUrl.split('/upload/')
    const pathWithoutExt = urlParts[1].substring(0, urlParts[1].lastIndexOf('.')) || urlParts[1]
    const optimizedUrl = `${urlParts[0]}/upload/q_auto,f_mp4/${pathWithoutExt}.mp4`

    const docRef = await addDoc(collection(db, 'posts'), {
      videoUrl: optimizedUrl,
      cloudinaryPublicId: publicId,
      caption: caption,
      status: 'pending',
      ratingSum: 0,
      ratingCount: 0,
      author: user ? {
        username: user.username,
        profilePicUrl: user.profilePicUrl,
        name: user.name || user.username
      } : null,
      createdAt: serverTimestamp()
    })

    try {
      const moderateVideo = httpsCallable(functions, 'moderateVideo')
      moderateVideo({ postId: docRef.id, videoUrl: optimizedUrl, cloudinaryPublicId: publicId }).catch(e => {
        console.error("Failed to call moderateVideo in background:", e)
      })
    } catch (e) {
      console.error("Failed to initiate moderateVideo:", e)
    }

    return true
  } catch (err) {
    console.error("Cloudinary/Firebase Upload Error:", err)
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
