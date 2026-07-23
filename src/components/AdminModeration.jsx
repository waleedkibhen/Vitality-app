import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, doc, updateDoc, deleteDoc, collectionGroup
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '—'
  const secs = Math.floor((Date.now() - ts.toMillis()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function StatusPill({ label, color }) {
  const colors = {
    red:    { bg: '#3b0f0f', border: '#7f1d1d', text: '#f87171' },
    green:  { bg: '#052e16', border: '#14532d', text: '#4ade80' },
    yellow: { bg: '#2d1a00', border: '#713f12', text: '#fbbf24' },
  }
  const c = colors[color] || colors.yellow
  return (
    <span style={{
      backgroundColor: c.bg, border: `1px solid ${c.border}`,
      color: c.text, borderRadius: 6, padding: '2px 10px',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'
    }}>
      {label}
    </span>
  )
}

// ── Flagged Post Card ─────────────────────────────────────────────────────────

function FlaggedCard({ post }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // 'approved' | 'deleted'

  const handleApprove = async () => {
    setBusy(true)
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'approved', flaggedAt: null, flagReason: null })
      setDone('approved')
    } catch (e) {
      console.error('Approve failed:', e)
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete this post by @${post.author?.username}? This cannot be undone.`)) return
    setBusy(true)
    try {
      // Delete Cloudinary video if we have the public ID
      if (post.cloudinaryPublicId) {
        const del = httpsCallable(functions, 'deleteCloudinaryVideo')
        await del({ publicId: post.cloudinaryPublicId })
      }
      await deleteDoc(doc(db, 'posts', post.id))
      setDone('deleted')
    } catch (e) {
      console.error('Delete failed:', e)
      setBusy(false)
    }
  }

  if (done === 'approved') return (
    <div style={cardStyle('#052e16', '#14532d')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: 14, fontWeight: 600 }}>
        <span>✓</span> Post approved and pushed to public feed.
      </div>
    </div>
  )

  if (done === 'deleted') return (
    <div style={cardStyle('#1a0505', '#450a0a')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 14, fontWeight: 600 }}>
        <span>✗</span> Post permanently deleted.
      </div>
    </div>
  )

  return (
    <div style={cardStyle('#111', '#2a2a2a')}>
      
      {/* ── Header: author info ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #222' }}>
        {post.author?.profilePicUrl ? (
          <img
            src={post.author.profilePicUrl}
            alt={post.author.username}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#555' }}>
            👤
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {post.author?.name || post.author?.username || 'Unknown User'}
          </div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            @{post.author?.username || '—'} · Flagged {timeAgo(post.flaggedAt)}
          </div>
        </div>
        <StatusPill label="Flagged" color="red" />
      </div>

      {/* ── Video preview ─────────────────────────────────────────── */}
      <div style={{ background: '#000', maxHeight: 420, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <video
          src={post.videoUrl}
          poster={post.videoUrl ? post.videoUrl.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.[^/.]+$/, ".jpg") : undefined}
          controls
          playsInline
          preload="metadata"
          style={{ width: '100%', maxHeight: 420, objectFit: 'contain' }}
        />
      </div>

      {/* ── Caption ───────────────────────────────────────────────── */}
      {post.caption && (
        <div style={{ padding: '12px 20px', color: '#ccc', fontSize: 14, lineHeight: 1.5, borderBottom: '1px solid #1a1a1a' }}
          dangerouslySetInnerHTML={{ __html: post.caption }}
        />
      )}

      {/* ── Flag reason & Backend Error Log ───────────────────────── */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <div>
          <span style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>⚠ Reason: </span>
          <span style={{ color: '#888', fontSize: 12 }}>{post.flagReason || 'Policy violation detected'}</span>
        </div>
        
        {post.error_log && (
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#ffb800', fontSize: 12, fontWeight: 600 }}>🔧 Backend Crash Log:</span>
            <pre style={{ 
              marginTop: 6, 
              padding: 10, 
              background: '#1a1600', 
              border: '1px solid #332b00',
              color: '#ffb800', 
              fontSize: 11, 
              borderRadius: 6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              userSelect: 'all' // Makes it easy to long-press and copy on mobile
            }}>
              {post.error_log}
            </pre>
          </div>
        )}

        {post.openai_raw_dump && (
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>🤖 OpenAI Raw Response:</span>
            <pre style={{ 
              marginTop: 6, 
              padding: 10, 
              background: '#0f172a', 
              border: '1px solid #1e3a8a',
              color: '#93c5fd', 
              fontSize: 11, 
              borderRadius: 6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              userSelect: 'all'
            }}>
              {post.openai_raw_dump}
            </pre>
          </div>
        )}
      </div>

      {/* ── Action buttons ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px' }}>
        <button
          onClick={handleApprove}
          disabled={busy}
          id={`approve-${post.id}`}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #14532d',
            background: busy ? '#0a0a0a' : '#052e16', color: busy ? '#555' : '#4ade80',
            fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { if (!busy) e.target.style.background = '#14532d' }}
          onMouseLeave={e => { if (!busy) e.target.style.background = '#052e16' }}
        >
          {busy ? '...' : '✓ Approve'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          id={`delete-${post.id}`}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #7f1d1d',
            background: busy ? '#0a0a0a' : '#1f0505', color: busy ? '#555' : '#f87171',
            fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { if (!busy) e.target.style.background = '#3b0f0f' }}
          onMouseLeave={e => { if (!busy) e.target.style.background = '#1f0505' }}
        >
          {busy ? '...' : '✕ Delete'}
        </button>
      </div>
    </div>
  )
}

function cardStyle(bg, border) {
  return {
    background: bg, border: `1px solid ${border}`,
    borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
  }
}

// ── Flagged Comment Card ───────────────────────────────────────────────────────

function FlaggedCommentCard({ comment }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const handleApprove = async () => {
    setBusy(true)
    try {
      // Assuming comment is stored at posts/{postId}/comments/{commentId}
      // Wait, we need the path! The snapshot in collectionGroup gives us the full path in doc.ref
      await updateDoc(comment.ref, { status: 'approved' })
      setDone('approved')
    } catch (e) {
      console.error('Approve failed:', e)
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete this comment?`)) return
    setBusy(true)
    try {
      await deleteDoc(comment.ref)
      setDone('deleted')
    } catch (e) {
      console.error('Delete failed:', e)
      setBusy(false)
    }
  }

  if (done === 'approved') return (
    <div style={cardStyle('#052e16', '#14532d')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: 14, fontWeight: 600, padding: 16 }}>
        <span>✓</span> Comment approved and pushed to public feed.
      </div>
    </div>
  )

  if (done === 'deleted') return (
    <div style={cardStyle('#1a0505', '#450a0a')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 14, fontWeight: 600, padding: 16 }}>
        <span>✗</span> Comment permanently deleted.
      </div>
    </div>
  )

  return (
    <div style={cardStyle('#111', '#2a2a2a')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #222' }}>
        {comment.authorProfilePic ? (
          <img src={comment.authorProfilePic} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#555' }}>
            👤
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {comment.authorUsername || 'Unknown User'}
          </div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            Posted {timeAgo(comment.createdAt)}
          </div>
        </div>
        <StatusPill label="Flagged" color="red" />
      </div>

      <div style={{ padding: '16px 20px', color: '#eee', fontSize: 15, lineHeight: 1.5, borderBottom: '1px solid #1a1a1a', whiteSpace: 'pre-wrap' }}>
        {comment.text}
      </div>

      <div style={{ padding: '10px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>⚠ Flagged by AI Moderation</span>
        
        {comment.moderationResult && (
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>🤖 OpenAI Raw Scores:</span>
            <pre style={{ 
              marginTop: 6, padding: 10, background: '#0f172a', border: '1px solid #1e3a8a',
              color: '#93c5fd', fontSize: 11, borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap'
            }}>
              {JSON.stringify(comment.moderationResult.category_scores, null, 2)}
            </pre>
          </div>
        )}
        
        {comment.error_log && (
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#ffb800', fontSize: 12, fontWeight: 600 }}>🔧 Backend Error:</span>
            <pre style={{ 
              marginTop: 6, padding: 10, background: '#1a1600', border: '1px solid #332b00',
              color: '#ffb800', fontSize: 11, borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap'
            }}>
              {comment.error_log}
            </pre>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '14px 20px' }}>
        <button
          onClick={handleApprove}
          disabled={busy}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #14532d',
            background: busy ? '#0a0a0a' : '#052e16', color: busy ? '#555' : '#4ade80',
            fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
          }}
        >
          {busy ? '...' : '✓ Approve'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #7f1d1d',
            background: busy ? '#0a0a0a' : '#1f0505', color: busy ? '#555' : '#f87171',
            fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
          }}
        >
          {busy ? '...' : '✕ Delete'}
        </button>
      </div>
    </div>
  )
}

// ── Main AdminModeration Page ─────────────────────────────────────────────────

export default function AdminModeration() {
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'comments'
  
  const [posts, setPosts]     = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError]     = useState(null)

  const [comments, setComments]     = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError]     = useState(null)

  useEffect(() => {
    // 1. Listen to flagged posts
    const qPosts = query(
      collection(db, 'posts'),
      where('status', '==', 'flagged'),
      limit(50)
    )

    const unsubPosts = onSnapshot(qPosts, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })))
      setPostsLoading(false)
    }, err => {
      console.error('Posts query failed:', err)
      setPostsError('Failed to load flagged posts.')
      setPostsLoading(false)
    })

    // 2. Listen to flagged comments via collectionGroup
    const qComments = query(
      collectionGroup(db, 'comments'),
      where('status', '==', 'flagged'),
      limit(50)
    )

    const unsubComments = onSnapshot(qComments, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })))
      setCommentsLoading(false)
    }, err => {
      console.error('Comments query failed:', err)
      setCommentsError('Failed to load flagged comments. Index may still be building.')
      setCommentsLoading(false)
    })

    return () => {
      unsubPosts()
      unsubComments()
    }
  }, [])

  const currentList = activeTab === 'posts' ? posts : comments
  const isLoading = activeTab === 'posts' ? postsLoading : commentsLoading
  const currentError = activeTab === 'posts' ? postsError : commentsError

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Page Header ───────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🛡</span>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Admin Moderation
            </h1>
          </div>
          <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
            Review content flagged by Sightengine or OpenAI. Approve to publish or delete to remove permanently.
          </p>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid #222', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab('posts')}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === 'posts' ? '#222' : 'transparent',
              color: activeTab === 'posts' ? '#fff' : '#888',
              border: 'none', cursor: 'pointer'
            }}
          >
            Videos {posts.length > 0 && <span style={{ marginLeft: 6, color: '#f87171' }}>({posts.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === 'comments' ? '#222' : 'transparent',
              color: activeTab === 'comments' ? '#fff' : '#888',
              border: 'none', cursor: 'pointer'
            }}
          >
            Comments {comments.length > 0 && <span style={{ marginLeft: 6, color: '#f87171' }}>({comments.length})</span>}
          </button>
        </div>

        {/* ── States ────────────────────────────────────────────── */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #222', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#555', fontSize: 13 }}>Loading flagged {activeTab}…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {currentError && (
          <div style={{ background: '#1a0505', border: '1px solid #450a0a', borderRadius: 12, padding: '16px 20px', color: '#f87171', fontSize: 14 }}>
            {currentError}
          </div>
        )}

        {!isLoading && !currentError && currentList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#333' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <p style={{ color: '#4ade80', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>All clear!</p>
            <p style={{ color: '#444', fontSize: 13, margin: 0 }}>No flagged {activeTab} waiting for review.</p>
          </div>
        )}

        {/* ── Flagged items list ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeTab === 'posts'
            ? currentList.map(post => <FlaggedCard key={post.id} post={post} />)
            : currentList.map(comment => <FlaggedCommentCard key={comment.id} comment={comment} />)
          }
        </div>

      </div>
    </div>
  )
}
