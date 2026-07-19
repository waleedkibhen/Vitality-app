require('dotenv').config()
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
admin.initializeApp({
  projectId: 'virality-ede9d',
  storageBucket: 'virality-ede9d.firebasestorage.app'
})

exports.verifyWhopUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // 1. Extract and validate JWT using user's specified approach
      const whopToken = req.headers['x-whop-user-token']
      console.log('Incoming Headers:', JSON.stringify(req.headers))
      
      if (!whopToken) {
        console.error('MISSING TOKEN HEADER')
        return res.status(401).json({ error: 'Missing x-whop-user-token header' })
      }

      let userId, username, profile_pic_url;

      if (whopToken === 'dev_mock_token') {
        console.log('Intercepted dev_mock_token. Bypassing Whop API.')
        userId = 'mock_dev_user_123'
        username = 'Test Clipper'
        profile_pic_url = 'https://ui-avatars.com/api/?name=Test+Clipper&background=random'
      } else {
        try {
          // Decode the JWT locally to extract the user ID
          const payloadBase64 = whopToken.split('.')[1]
          if (!payloadBase64) throw new Error("Invalid JWT format")
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString()
          const payload = JSON.parse(payloadJson)
          userId = payload.sub || payload.id || payload.userId
          
          if (!userId) throw new Error("No user ID found in JWT payload")

          // Securely fetch the profile using our Developer API Key
          const { Whop } = require('@whop/sdk')
          const whopClient = new Whop({ apiKey: process.env.WHOP_API_KEY })
          const profileData = await whopClient.users.retrieve(userId)
          
          username = profileData.username || `whop_${userId}`
          profile_pic_url = profileData.profile_picture?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
        } catch (err) {
          console.error('WHOP SDK FAILED:', err.message)
          return res.status(401).json({ error: 'Failed to extract or fetch Whop profile', details: err.message })
        }
      }

      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true'

      if (isEmulator) {
        console.log('Running in local emulator. Bypassing Firebase Admin (Firestore/Auth) to prevent ENOTFOUND metadata errors.')
        return res.status(200).json({
          mock: true,
          user: {
            username,
            profilePicUrl: profile_pic_url
          }
        })
      }

      // 3. Save/Update the user's details into Firestore
      await admin.firestore().collection('users').doc(userId).set({
        username,
        profilePicUrl: profile_pic_url,
        whopId: userId,
        lastLogin: new Date()
      }, { merge: true })

      // 4. Generate a Firebase Custom Auth token
      const customToken = await admin.auth().createCustomToken(userId)

      // 5. Return the Custom Token
      return res.status(200).json({
        customToken
      })
      
    } catch (error) {
      console.error('Error verifying Whop user:', error)
      // Send a readable text string instead of an unreadable JSON object
      return res.status(500).send(error.message || 'Internal Server Error')
    }
  })
})

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.deleteCloudinaryVideo = functions.region("europe-west1").https.onCall(async (data, context) => {
    const { publicId } = data;
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      console.log('Successfully deleted video from Cloudinary:', publicId);
    } catch (err) {
      console.error('Error deleting from Cloudinary:', err);
    }
});

const axios = require('axios');

exports.moderateVideo = functions.runWith({
    timeoutSeconds: 540,
    memory: '256MB'
}).region("europe-west1").https.onCall(async (data, context) => {
    const { postId, videoUrl, cloudinaryPublicId } = data || {};
    
    if (!postId || !videoUrl) {
        console.error("Missing postId or videoUrl", { data });
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    console.log(`Moderating new video for post ${postId} via Sightengine`);

    // Force the URL to be a plain text string so Sightengine can read it
    const finalVideoUrl = typeof videoUrl === 'string' ? videoUrl : (videoUrl.secure_url || videoUrl.url);

    if (!finalVideoUrl) {
        console.error("Failed to extract plain URL from videoUrl object", videoUrl);
        throw new functions.https.HttpsError('invalid-argument', 'Invalid videoUrl format');
    }

    try {
        const response = await axios.get('https://api.sightengine.com/1.0/video/check-sync.json', {
            params: {
                models: 'nudity-2.1,weapon,gore',
                api_user: '623553132', 
                api_secret: 'FGxXdSDqmQ7ecqZMwNG2yi3hrhUTimh2',
                stream_url: finalVideoUrl
            },
            timeout: 60000
        });

        let isExplicit = false;
        if (response.data && response.data.data && response.data.data.frames) {
            isExplicit = response.data.data.frames.some(frame => 
                (frame.nudity && frame.nudity.none < 0.5) || 
                (frame.weapon && frame.weapon.prob > 0.5) ||
                (frame.gore && frame.gore.prob > 0.5)
            );
        }

        const newStatus = isExplicit ? 'flagged' : 'approved';
        
        // Use set with merge: true to guarantee it saves without crashing
        await admin.firestore().collection('posts').doc(postId).set({ status: newStatus }, { merge: true });
        
        return { success: true, status: newStatus };

    } catch (error) {
        console.error("SIGHTENGINE FAILED:", error.message);
        
        // THE ULTIMATE SAFETY NET: Guarantee it goes to the Admin section
        await admin.firestore().collection('posts').doc(postId).set({ 
            status: 'flagged',
            adminNote: 'Sightengine connection failed: ' + error.message
        }, { merge: true });
        
        throw new functions.https.HttpsError('internal', 'Sightengine moderation failed', error.message);
    }
});

const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.onReportAdded = onDocumentCreated({
    document: 'posts/{postId}/reports/{reportId}',
    region: 'europe-west1'
}, async (event) => {
    const postId = event.params.postId;
    const postRef = admin.firestore().collection('posts').doc(postId);
    
    await admin.firestore().runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) return;
        
        const currentCount = postDoc.data().reportCount || 0;
        const newCount = currentCount + 1;
        
        if (newCount >= 3 && postDoc.data().status !== 'flagged') {
            transaction.update(postRef, { 
                reportCount: newCount,
                status: 'flagged',
                adminNote: 'Auto-flagged: Reached 3 user reports threshold'
            });
        } else {
            transaction.update(postRef, { reportCount: newCount });
        }
    });
});
