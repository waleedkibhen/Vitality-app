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
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'

function MainApp() {
  const [isPendingUpload, setPendingUpload] = useState(false)
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin')
  const { loading, user } = useAuth()

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#888] font-medium animate-pulse tracking-wide text-sm">Authenticating with Whop...</p>
      </div>
    )
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            border: '1px solid #222',
            fontFamily: 'Geist, Inter, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
          },
          success: {
            iconTheme: { primary: '#fff', secondary: '#111' }
          }
        }}
      />
      {isAdmin ? (
        <AdminModeration />
      ) : (
        <div className="min-h-screen bg-black font-inter">
          
          {/* Single-column, centered layout */}
          <main
          className="mx-auto pt-8 px-4 pb-24"
          style={{ maxWidth: '640px' }}
          role="main"
          aria-label="Virality Predictor"
        >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex flex-col">
              <h1 className="text-white text-[19px] font-semibold tracking-tight leading-none mb-1.5">
                Rate the Videos
              </h1>
              <p className="text-[#999] text-[14px] font-normal leading-snug">
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
                color: '#aaa', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.15s', flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' }}
            >
              🛡 Admin
            </a>
          </div>
          
          <div className="mb-10">
            {user ? (
              <Composer setPendingUpload={setPendingUpload} />
            ) : (
              <div className="bg-[#111] border border-[#222] rounded-xl p-6 text-center">
                <p className="text-[#888] text-[14px]">You must be logged in via Whop to post videos.</p>
              </div>
            )}
          </div>
          
          <Feed isPendingUpload={isPendingUpload} />
        </main>
      </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
