import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PostItem from './PostItem'
import { useAuth } from '../context/AuthContext'

export default function Feed({ isPendingUpload }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    // Limit to 50 posts to prevent massive Firestore read costs as the app scales
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        // Show approved posts to everyone. Show pending posts ONLY to the author.
        .filter(post => post.status === 'approved' || (user && post.author?.username === user.username))
      setPosts(newPosts)
    }, (err) => {
      console.error("Error fetching posts:", err)
      setError("Failed to load feed. Check your Firebase Security Rules.")
    })

    return () => unsubscribe()
  }, [])

  if (error) {
    return (
      <div className="mt-8 text-center text-red-500 text-sm font-medium p-4 bg-red-950/30 rounded-none border border-red-900/40">
        {error}
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-6">
      
      {/* ── Background Upload Pending Card ── */}
      {isPendingUpload && (
        <div className="bg-[#0a0a0a] border border-[#222] p-6 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-[#333] border-t-[#fff] rounded-full animate-spin" />
          <p className="text-[#eee] text-[13px] font-medium tracking-wide">Uploading in background... Please keep this tab open.</p>
        </div>
      )}

      {posts.length === 0 && !isPendingUpload && (
        <div className="text-center text-[#555] text-sm py-8">
          No videos posted yet.
        </div>
      )}
      
      {posts.map(post => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  )
}
