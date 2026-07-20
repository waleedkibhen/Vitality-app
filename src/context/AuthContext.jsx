import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { signInWithCustomToken } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { app, db, auth } from '../lib/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    async function initializeWhopAuth() {
      try {
        // We use the Vite proxy in local dev, but use the absolute Cloud Function URL in production on Cloudflare.
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'virality-ede9d'
        // We now route this strictly to our Cloudflare Pages Function Proxy (/api/verifyWhopUser).
        // Whop's reverse proxy will securely intercept this same-origin request and inject the 
        // x-whop-user-token header before it hits Cloudflare.
        // We no longer try to find the token in the URL or Hash.
        const endpoint = '/api/verifyWhopUser'

        // The Cloudflare function will read the injected header and forward it to Firebase.
        // In local development, we manually inject our own mock token since we bypass Cloudflare.
        const res = await axios.get(`${endpoint}?_cb=${Date.now()}`, {
          headers: import.meta.env.DEV ? { 'x-whop-user-token': 'dev_mock_token' } : undefined
        })
        
        if (res.data.mock) {
          setUser(res.data.user)
          setLoading(false)
          return
        }

        const { customToken } = res.data

        if (!customToken) {
          throw new Error(`Backend did not return customToken. Received: ${JSON.stringify(res.data)}`)
        }
        
        if (typeof customToken !== 'string') {
          throw new Error(`Backend returned customToken as a ${typeof customToken} instead of string. Value: ${JSON.stringify(customToken)}`)
        }

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
        console.error("Silent Auth Failed:", err.response?.data || err.message)
        let errorMsg = err.message
        if (err.response?.data) {
          errorMsg = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)
        }
        setAuthError(`Auth Failed: ${errorMsg}`)
      } finally {
        setLoading(false)
      }
    }

    initializeWhopAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
