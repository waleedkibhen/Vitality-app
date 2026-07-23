import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Heart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - date) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + 'y'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + 'mo'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + 'd'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + 'h'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + 'm'
  return Math.floor(seconds) + 's'
}

export default function CommentThread({ postId, postAuthor }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null) // { id: rootCommentId, username: string }
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // UI Polish States
  const [lastCommentTime, setLastCommentTime] = useState(0)
  const [expandedReplies, setExpandedReplies] = useState({})

  useEffect(() => {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter out flagged comments from UI entirely
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => c.status !== 'flagged'))
    })
    return () => unsubscribe()
  }, [postId])

  const toggleReplies = (rootId) => {
    setExpandedReplies(prev => ({ ...prev, [rootId]: !prev[rootId] }))
  }

  // Group comments: roots and children
  const roots = comments.filter(c => !c.parentId)
  const childrenMap = {} // parentId -> array of child comments
  comments.forEach(c => {
    if (c.parentId) {
      if (!childrenMap[c.parentId]) childrenMap[c.parentId] = []
      childrenMap[c.parentId].push(c)
    }
  })

  // Sort children so author's replies are first
  Object.keys(childrenMap).forEach(parentId => {
    childrenMap[parentId].sort((a, b) => {
      const aIsCreator = a.authorUsername === postAuthor?.username
      const bIsCreator = b.authorUsername === postAuthor?.username
      if (aIsCreator && !bIsCreator) return -1
      if (!aIsCreator && bIsCreator) return 1
      return 0 // Keep original createdAt order otherwise
    })
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !user) return

    // 15-second frontend cooldown
    const now = Date.now()
    if (now - lastCommentTime < 15000) {
      toast.error('Please wait 15 seconds before posting another comment.')
      return
    }

    setIsSubmitting(true)
    
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text: commentText.trim(),
        authorId: user.uid || user.username,
        authorUsername: user.username,
        authorName: user.name || user.username,
        authorProfilePic: user.profilePicUrl || null,
        upvotes: 0,
        upvoters: [],
        parentId: replyingTo ? replyingTo.id : null,
        createdAt: serverTimestamp()
      })
      setCommentText('')
      setReplyingTo(null)
      setLastCommentTime(Date.now())
    } catch (err) {
      console.error("Failed to post comment:", err)
      toast.error("Failed to post comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpvote = async (commentId, currentUpvoters) => {
    if (!user) {
      toast.error("Must be logged in to upvote")
      return
    }
    const userId = user.uid || user.username
    const commentRef = doc(db, 'posts', postId, 'comments', commentId)
    const hasUpvoted = currentUpvoters?.includes(userId)
    
    try {
      if (hasUpvoted) {
        await updateDoc(commentRef, {
          upvotes: Math.max(0, (currentUpvoters.length || 1) - 1),
          upvoters: arrayRemove(userId)
        })
      } else {
        await updateDoc(commentRef, {
          upvotes: (currentUpvoters?.length || 0) + 1,
          upvoters: arrayUnion(userId)
        })
      }
    } catch (err) {
      console.error("Failed to toggle upvote:", err)
    }
  }

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId))
    } catch (err) {
      console.error("Failed to delete comment:", err)
      toast.error("Failed to delete comment")
    }
  }

  const renderComment = (c, isReply = false) => {
    const userId = user?.uid || user?.username
    const hasUpvoted = c.upvoters?.includes(userId)
    const timeStr = c.createdAt?.toDate ? timeAgo(c.createdAt.toDate()) : ''
    const isCreator = c.authorUsername === postAuthor?.username
    const isOwner = c.authorId === userId || c.authorUsername === user?.username
    
    return (
      <div key={c.id} className={`flex gap-3 mb-4 ${isReply ? 'ml-10 mt-[-4px]' : ''}`}>
        {/* Avatar */}
        {c.authorProfilePic ? (
          <img src={c.authorProfilePic} alt="" className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover shrink-0 bg-[#111]`} />
        ) : (
          <div className={`${isReply ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[12px]'} rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#333]`}>
            <span className="text-[#666] font-bold">{c.authorUsername?.charAt(0) || '?'}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-white text-[13px] font-bold">{c.authorUsername}</span>
            {isCreator && (
              <span className="text-[9px] font-bold bg-[#2563EB]/20 text-[#2563EB] px-1.5 py-0.5 rounded border border-[#2563EB]/30 uppercase tracking-wider translate-y-[-1px]">
                Creator
              </span>
            )}
            <span className="text-[#666] text-[12px]">{timeStr}</span>
          </div>
          <p className="text-[#e1e1e1] text-[14px] mt-0.5 break-words">{c.text}</p>
          
          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => handleUpvote(c.id, c.upvoters)}
              className={`flex items-center gap-1.5 text-[12px] transition-colors ${hasUpvoted ? 'text-red-500' : 'text-[#888] hover:text-white'}`}
            >
              <Heart size={14} className={hasUpvoted ? 'fill-current' : ''} />
              <span>{c.upvotes || 0}</span>
            </button>
            
            <button 
              onClick={() => setReplyingTo({ id: isReply ? c.parentId : c.id, username: c.authorUsername })}
              className="text-[#888] text-[12px] hover:text-white transition-colors"
            >
              Reply
            </button>

            {isOwner && (
              <button 
                onClick={() => handleDelete(c.id)}
                className="text-[#888] hover:text-red-500 transition-colors ml-auto"
                aria-label="Delete comment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 scrollbar-hide max-h-[35vh]">
        {roots.length === 0 ? (
          <p className="text-[#555] text-sm text-center py-6">No comments yet. Be the first to start the conversation!</p>
        ) : (
          roots.map(root => {
            const children = childrenMap[root.id] || []
            const isExpanded = expandedReplies[root.id]

            return (
              <div key={root.id}>
                {renderComment(root, false)}
                
                {children.length > 0 && !isExpanded && (
                  <button 
                    onClick={() => toggleReplies(root.id)}
                    className="ml-[3.25rem] mt-[-8px] mb-4 text-[#888] text-[12px] font-bold flex items-center gap-2 hover:text-[#bbb] transition-colors"
                  >
                    <div className="w-6 h-[1px] bg-[#333]"></div>
                    View {children.length} {children.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
                
                {isExpanded && children.map(child => renderComment(child, true))}
                
                {isExpanded && children.length > 0 && (
                  <button 
                    onClick={() => toggleReplies(root.id)}
                    className="ml-[3.25rem] mt-[-8px] mb-4 text-[#888] text-[12px] font-bold flex items-center gap-2 hover:text-[#bbb] transition-colors"
                  >
                    <div className="w-6 h-[1px] bg-[#333]"></div>
                    Hide replies
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="pt-3 pb-2 mt-2 bg-[#111]">
        {replyingTo && (
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[#888] text-[12px]">Replying to <span className="text-[#2563EB]">@{replyingTo.username}</span></span>
            <button onClick={() => setReplyingTo(null)} className="text-[#888] text-[12px] hover:text-white">Cancel</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3 px-2">
          {user?.profilePicUrl ? (
            <img src={user.profilePicUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#333]" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2563EB]/20 flex items-center justify-center shrink-0 border border-[#2563EB]/30">
              <span className="text-[#2563EB] font-bold">{user?.username?.charAt(0) || '?'}</span>
            </div>
          )}
          <div className="flex-1 flex items-center bg-[#1a1a1a] rounded-full px-4 border border-[#333] focus-within:border-[#555] transition-colors">
            <input 
              type="text" 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="bg-transparent text-white text-[14px] placeholder-[#666] outline-none w-full py-2"
            />
            <button 
              type="submit" 
              disabled={!commentText.trim() || isSubmitting}
              className="text-[#2563EB] font-bold text-[14px] disabled:opacity-50 ml-2 hover:text-[#3b82f6] transition-colors"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
