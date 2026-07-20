import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { signInWithCustomToken } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { app, db, auth } from '../lib/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initializeWhopAuth() {
      try {
        // We use the Vite proxy in local dev, but use the absolute Cloud Function URL in production on Cloudflare.
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'virality-ede9d'
        const endpoint = import.meta.env.DEV 
          ? '/api/verifyWhopUser' 
          : `https://us-central1-${projectId}.cloudfunctions.net/verifyWhopUser`
        
        // Safely extract the Whop token whether it's in the search query or stuck behind a hash router
        const queryStr = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
        const urlParams = new URLSearchParams(queryStr);
        const whopToken = urlParams.get('token') || urlParams.get('biz_user_token') || urlParams.get('id_token');

        // Pass the token as a query parameter to avoid CORS preflight header blocking
        const finalToken = whopToken || 'dev_mock_token';
        const res = await axios.get(`${endpoint}?token=${finalToken}&_cb=${Date.now()}`)
        
        if (res.data.mock) {
          setUser(res.data.user)
          setLoading(false)
          return
        }

        const { customToken } = res.data

        // Silently sign in to Firebase with the generated custom token
        const userCredential = await signInWithCustomToken(auth, customToken)

        // Fetch the profile info from Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Save the profile info to global state
          setUser({
            username: userData.username,
            profilePicUrl: userData.profilePicUrl
          })
        }

      } catch (err) {
        console.error("Silent Auth Failed, falling back to mock admin user for testing:", err.response?.data || err.message)
        setUser({
          username: 'vvisemen',
          name: 'Wisecrafts Admin',
          profilePicUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
        })
      } finally {
        setLoading(false)
      }
    }

    initializeWhopAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
