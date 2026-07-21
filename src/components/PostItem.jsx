import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, increment, collection, setDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'
import { Trash2, MessageCircle, Heart, BarChart3, Share, X, Info, Star, Flag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - date) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return Math.floor(seconds) + ' seconds ago'
}

export default function PostItem({ post }) {
  const { user } = useAuth()
  const postRef = useRef(null)
  const hasViewed = useRef(false)
  
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [hasRated, setHasRated] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  // Determine if the current user has permission to delete this post
  // Owner (vvisemen) can delete anything. Authors can delete their own posts.
  const canDelete = user && (user.username === 'vvisemen' || user.username === post.author?.username)

  // Calculate virality score
  const score = post.ratingCount > 0 ? (post.ratingSum / post.ratingCount).toFixed(1) : 'No rating yet'
  
  const numScore = parseFloat(score)
  let scoreColor = '#888888' // Default gray
  if (!isNaN(numScore)) {
    if (numScore <= 4.0) scoreColor = '#ef4444' // Red
    else if (numScore < 6.0) scoreColor = '#eab308' // Yellow
    else scoreColor = '#22c55e' // Green
  }

  useEffect(() => {
    // Check local storage for previous rating
    const savedRating = localStorage.getItem(`rated_${post.id}`)
    if (savedRating) {
      setHasRated(Number(savedRating) || true)
    }

    // Subscribe to real-time comments for this post
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    
    return () => unsubscribe()
  }, [post.id])

  useEffect(() => {
    if (!postRef.current || hasViewed.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasViewed.current) {
        hasViewed.current = true
        setTimeout(() => {
          if (!sessionStorage.getItem(`viewed_${post.id}`)) {
            sessionStorage.setItem(`viewed_${post.id}`, 'true')
            updateDoc(doc(db, 'posts', post.id), {
              viewCount: increment(1)
            }).catch(() => {})
          }
        }, 1000)
        observer.disconnect()
      }
    }, { threshold: 0.6 });
    
    observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [post.id])

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
      const reportRef = doc(db, 'posts', post.id, 'reports', user.uid)
      await setDoc(reportRef, {
        reason: reportReason,
        reportedBy: user.uid,
        createdAt: serverTimestamp()
      })
      toast.success('Report submitted successfully.')
      setIsReportModalOpen(false)
    } catch (error) {
      console.error('Report error:', error)
      toast.error('Failed to submit report.')
    } finally {
      setIsReporting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return
    setIsDeleting(true)
    try {
      if (post.cloudinaryPublicId) {
        try {
          const deleteCloudinaryVideo = httpsCallable(functions, 'deleteCloudinaryVideo')
          await deleteCloudinaryVideo({ publicId: post.cloudinaryPublicId })
        } catch (e) {
          console.error("Failed to delete from cloudinary", e)
        }
      }
      await deleteDoc(doc(db, 'posts', post.id))
    } catch (err) {
      console.error("Failed to delete post:", err)
      alert("Failed to delete post: " + err.message)
      setIsDeleting(false)
    }
  }

  const handleRate = async (value) => {
    const prevRatedVal = localStorage.getItem(`rated_${post.id}`)
    
    if (prevRatedVal !== null && prevRatedVal !== undefined) {
      if (Number(prevRatedVal) === value) return // Do nothing if rating the same value
      if (!window.confirm(`Would you like to change your rating to ${value}?`)) return
      
      const oldVal = Number(prevRatedVal)
      
      // If we somehow got a corrupted value before, fallback to 0 diff logic to avoid NaN
      const diff = isNaN(oldVal) ? value : (value - oldVal)

      localStorage.setItem(`rated_${post.id}`, value.toString())
      setHasRated(value)
      
      try {
        await updateDoc(doc(db, 'posts', post.id), {
          ratingSum: increment(diff)
        })
      } catch (err) {
        console.error("Failed to update rating:", err)
      }
      return
    }

    setHasRated(value)
    localStorage.setItem(`rated_${post.id}`, value.toString())
    
    try {
      const dbRef = doc(db, 'posts', post.id)
      await updateDoc(dbRef, {
        ratingSum: increment(value),
        ratingCount: increment(1)
      })
    } catch (err) {
      console.error("Failed to submit rating:", err)
      setHasRated(false)
      localStorage.removeItem(`rated_${post.id}`)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    
    const text = commentText.trim()
    setCommentText('') // optimistically clear input
    
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error("Failed to post comment:", err)
    }
  }

  const createdAtDate = post.createdAt?.toDate ? post.createdAt.toDate() : null

  return (
    <div ref={postRef} className="bg-[#111] p-4 rounded-2xl overflow-hidden flex flex-col gap-4">
      
      {/* ── Author Header ── */}
      {/* ── Author Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {post.author?.profilePicUrl ? (
            <img 
              src={post.author.profilePicUrl} 
              alt={post.author?.username || 'user'} 
              className="w-10 h-10 rounded-full object-cover border border-[#333]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
              <span className="text-[#666] text-sm uppercase font-bold">
                {post.author?.username?.charAt(0) || post.uploader?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-[#f1f1f1] font-bold text-[15px]">{post.author?.name || post.uploader || 'Unknown'}</span>
            <div className="flex items-center gap-1.5 text-[#888] text-[13px]">
              <span>@{post.author?.username || 'user'}</span>
              {createdAtDate && (
                <>
                  <span className="text-[#555]">&middot;</span>
                  <span>{timeAgo(createdAtDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="text-[#666] hover:text-[#ff4444] hover:bg-[#ff4444]/10 p-2 rounded-lg transition-colors"
            aria-label="Report Post"
            title="Report this post"
          >
            <Flag size={18} />
          </button>
          {canDelete && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Delete post"
              title="Delete this post"
              className="text-[#666] hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
      {post.caption && (
        <div 
          className="text-[#f1f1f1] text-[15px] break-words whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: post.caption }}
        />
      )}
      
      {post.videoUrl && (
        <div className="bg-black border border-[#222] rounded-xl overflow-hidden flex justify-center items-center">
          <video
            src={`${post.videoUrl}#t=0.001`}
            poster={post.videoUrl.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.[^/.]+$/, ".jpg")}
            controls
            playsInline
            preload="metadata"
            className="w-full h-auto max-h-[70vh] object-contain outline-none"
          />
        </div>
      )}

      {/* ── Rating System ── */}
      <div className="flex flex-col gap-2 border-t border-[#222] pt-4 mt-2">
        <p className="text-[#888] text-[11px] uppercase tracking-wider font-semibold">
          {hasRated ? 'You rated this video' : 'Rate this video on how likely it is to go viral'}
        </p>
        <div className="flex justify-between gap-1 w-full pb-2">
          {[1,2,3,4,5,6,7,8,9,10].map(val => (
            <button
              key={val}
              onClick={() => handleRate(val)}
              className={`flex-1 aspect-square max-h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-200 
                ${hasRated === val
                  ? 'bg-[#2563EB] text-white border border-[#2563EB] scale-105 shadow-[0_0_12px_rgba(37,99,235,0.4)]' 
                  : 'bg-[#161616] text-[#999] border border-[#333] hover:bg-[#1a1a1a] hover:text-[#bbb] hover:scale-105 active:scale-95'
                }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Footer ── */}
      <div className="flex items-center gap-6 pt-2 pb-1 text-[#888]">
        <button onClick={() => setIsCommentModalOpen(true)} className="flex items-center gap-2 hover:text-[#2563EB] transition-colors group">
          <MessageCircle size={19} className="group-hover:fill-[#2563EB]/20" />
          <span className="text-[14px]">{comments.length}</span>
        </button>
        <div className="flex items-center gap-2 cursor-default">
          <BarChart3 size={19} />
          <span className="text-[14px]">{post.viewCount || 0}</span>
        </div>
        
        {/* Overall Rating Section */}
        <div className="flex items-center gap-2 cursor-help group relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="19" 
            height="19" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ color: scoreColor }}
            className="transition-colors"
          >
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          <span className="text-[14px]" style={{ color: scoreColor }}>{score}</span>
          <Info size={14} className="text-[#555] group-hover:text-[#888] transition-colors ml-0.5" />
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#222] border border-[#333] rounded-lg text-[11px] text-[#aaa] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center leading-relaxed">
            Overall average score based on all the people that rated this specific video.
          </div>
        </div>
      </div>

      {/* ── Comment Modal ── */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#333] w-full max-w-lg rounded-2xl p-5 relative flex flex-col gap-4 shadow-2xl">
            <button 
              onClick={() => setIsCommentModalOpen(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-white text-lg font-bold text-center border-b border-[#222] pb-3 mb-2">Reply</h2>
            
            {/* Modal Content - Original Post Context */}
            {post.author && (
              <div className="flex gap-3 relative">
                {/* Connecting Line */}
                <div className="absolute left-[19px] top-10 bottom-[-20px] w-[2px] bg-[#333]" />
                
                {post.author.profilePicUrl ? (
                  <img src={post.author.profilePicUrl} alt="" className="w-10 h-10 rounded-full object-cover z-10 bg-[#111]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center z-10 border border-[#333]">
                    <span className="text-[#666] font-bold">{post.author?.username?.charAt(0) || '?'}</span>
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-white font-bold truncate">{post.author?.name || 'Unknown'}</span>
                    <span className="text-[#888] text-sm truncate">@{post.author?.username || 'user'}</span>
                  </div>
                  {post.caption && (
                    <p className="text-[#ccc] text-[15px] mt-1 break-words whitespace-pre-wrap line-clamp-3">
                      {post.caption.replace(/<[^>]*>?/gm, '')}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Comment List */}
            <div className="flex flex-col gap-3 max-h-[35vh] overflow-y-auto mt-4 pl-[3.25rem] pr-2 scrollbar-hide">
               {comments.map(c => (
                 <div key={c.id} className="text-[#e1e1e1] text-[14px] bg-[#1a1a1a] p-3 rounded-xl border border-[#222]">
                   {c.text}
                 </div>
               ))}
               {comments.length === 0 && <p className="text-[#555] text-sm italic py-2">No replies yet.</p>}
            </div>

            {/* Reply Input */}
            <form onSubmit={(e) => {
              handleComment(e);
              setIsCommentModalOpen(false);
            }} className="flex gap-3 mt-4 pt-4 border-t border-[#222]">
              {user?.profilePicUrl ? (
                <img src={user.profilePicUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2563EB]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#2563EB] font-bold">{user?.username?.charAt(0) || '?'}</span>
                </div>
              )}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <p className="text-[#888] text-sm">Replying to <span className="text-[#2563EB]">@{post.author?.username || 'user'}</span></p>
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  autoFocus
                  className="bg-transparent text-white text-[15px] placeholder-[#666] outline-none w-full border-b border-transparent focus:border-[#222] pb-1 transition-colors"
                />
                <div className="flex justify-end mt-1">
                  <button 
                    type="submit" 
                    disabled={!commentText.trim()}
                    className="bg-[#2563EB] text-white px-5 py-1.5 rounded-full text-sm font-bold transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </form>
            
          </div>
        </div>
      )}

      {/* ── Report Modal ──────────────────────────────── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[320px] bg-[#111] border border-[#333] rounded-2xl p-5 shadow-2xl relative">
            <button 
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-white font-bold text-[18px] mb-1">Report Post</h3>
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

    </div>
  )
}
