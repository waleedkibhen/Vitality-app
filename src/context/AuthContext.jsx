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
        // We use the Vite proxy to route this relative path securely to the local emulator,
        // avoiding CORS and Mixed Content blocks from the Cloudflare HTTPS tunnel.
        const endpoint = '/api/verifyWhopUser'
        
        // Extract the Whop token from the iframe URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const whopToken = urlParams.get('token') || urlParams.get('biz_user_token') || urlParams.get('id_token');

        // Note: The @whop-apps/dev-proxy will physically inject the x-whop-user-token 
        // into the headers of this request when running locally.
        const res = await axios.get(`${endpoint}?_cb=${Date.now()}`, {
          headers: {
            'x-whop-user-token': whopToken || 'dev_mock_token'
          }
        })
        
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
