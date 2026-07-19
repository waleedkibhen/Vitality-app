/**
 * App.jsx
 * Main shell. Supports hash-based routing:
 *   /       → public feed + composer
 *   /#admin → admin moderation panel
 */

import { useState, useEffect } from 'react'
import Composer from './components/Composer'
import Feed from './components/Feed'
import AdminModeration from './components/AdminModeration'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  const [isPendingUpload, setPendingUpload] = useState(false)
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin')

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (isAdmin) {
    return (
      <AuthProvider>
        <AdminModeration />
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-black font-inter">
        
        {/* Single-column, centered layout */}
        <main
          className="mx-auto pt-8 px-4 pb-24"
          style={{ maxWidth: '640px' }}
          role="main"
          aria-label="Virality Predictor"
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex flex-col">
              <h1 className="text-white text-[17px] font-semibold tracking-tight leading-none mb-1">
                Rate the Videos
              </h1>
              <p className="text-[#888] text-[13px] font-normal leading-snug">
                Help clippers improve by rating their content and sharing feedback.
              </p>
            </div>
            <a
              href="#admin"
              id="admin-dashboard-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 10, padding: '7px 13px',
                color: '#aaa', fontSize: 12, fontWeight: 600,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.15s', flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' }}
            >
              🛡 Admin
            </a>
          </div>
          
          <Composer setPendingUpload={setPendingUpload} />
          
          <Feed isPendingUpload={isPendingUpload} />
        </main>
      </div>
    </AuthProvider>
  )
}

