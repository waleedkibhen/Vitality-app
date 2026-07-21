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
      const whopToken = req.query.token || req.headers['x-whop-user-token']
      
      if (!whopToken) {
        console.error('MISSING TOKEN')
        return res.status(401).json({ error: 'Missing token parameter or x-whop-user-token header' })
      }

      let userId, username, name, profile_pic_url;

      if (whopToken === 'dev_mock_token') {
        console.log('Intercepted dev_mock_token. Bypassing Whop API.')
        userId = 'mock_dev_user_123'
        username = 'testclipper'
        name = 'Test Clipper'
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
          name = profileData.name || [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || username
          profile_pic_url = profileData.profile_picture?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
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
            name,
            profilePicUrl: profile_pic_url
          }
        })
      }

      // 3. Save/Update the user's details into Firestore
      await admin.firestore().collection('users').doc(userId).set({
        username,
        name,
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

const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.onReportAdded = onDocumentCreated({
    document: 'posts/{postId}/reports/{reportId}',
    region: 'europe-west1'
}, async (event) => {
    const postId = event.params.postId;
    const reportData = event.data.data();
    const reporterId = reportData?.reportedBy;
    
    let isOwner = false;
    if (reporterId === 'vvisemen' || reporterId === '@vvisemen') {
        isOwner = true;
    }

    const postRef = admin.firestore().collection('posts').doc(postId);
    
    await admin.firestore().runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) return;
        
        const currentCount = postDoc.data().reportCount || 0;
        const newCount = currentCount + 1;
        
        const threshold = isOwner ? 1 : 3;
        
        if (newCount >= threshold && postDoc.data().status !== 'flagged') {
            transaction.update(postRef, { 
                reportCount: newCount,
                status: 'flagged',
                adminNote: isOwner ? 'Flagged instantly by Admin' : 'Auto-flagged: Reached 3 user reports threshold'
            });
        } else {
            transaction.update(postRef, { reportCount: newCount });
        }
    });
});

const { OpenAI } = require("openai");

exports.onPostCreated = onDocumentCreated({
    document: 'posts/{postId}',
    region: 'us-central1' // Note: change if your firestore is not us-central1
}, async (event) => {
    const postDoc = event.data;
    if (!postDoc) return;
    
    const data = postDoc.data();
    if (data.status !== 'pending_review') return;
    
    const postId = event.params.postId;
    const postRef = admin.firestore().collection('posts').doc(postId);
    
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("Missing OPENAI_API_KEY. Approving post by default.");
            await postRef.update({ status: 'approved' });
            return;
        }

        const openai = new OpenAI({ apiKey });
        
        // Strip HTML tags from caption
        const rawCaption = data.caption || "";
        const plainTextCaption = rawCaption.replace(/<[^>]*>?/gm, '');
        
        const inputs = [];
        if (plainTextCaption.trim().length > 0) {
            inputs.push({ type: "text", text: plainTextCaption });
        }
        
        const publicId = data.cloudinaryPublicId;
        if (publicId) {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            // Generate frame URLs directly from Cloudinary
            const frame0 = `https://res.cloudinary.com/${cloudName}/video/upload/so_0/v1/${publicId}.jpg`;
            const frame50 = `https://res.cloudinary.com/${cloudName}/video/upload/so_50p/v1/${publicId}.jpg`;
            
            inputs.push({ type: "image_url", image_url: { url: frame0 } });
            inputs.push({ type: "image_url", image_url: { url: frame50 } });
        }

        if (inputs.length === 0) {
            await postRef.update({ status: 'approved' });
            return;
        }

        const moderation = await openai.moderations.create({
            model: "omni-moderation-latest",
            input: inputs
        });

        const result = moderation.results[0];
        const threshold = parseFloat(process.env.MODERATION_THRESHOLD || "0.8");
        
        let isFlagged = result.flagged; // OpenAI's default boolean flag
        
        // Also check continuous scores against our custom threshold
        const scores = result.category_scores;
        for (const [category, score] of Object.entries(scores)) {
            if (score >= threshold) {
                isFlagged = true;
                console.log(`Flagged due to category [${category}] score: ${score}`);
                break;
            }
        }
        
        if (isFlagged) {
            await postRef.update({ 
                status: 'flagged',
                moderationResult: result // Save the result for admin review
            });
            console.log(`Post ${postId} flagged and hidden.`);
        } else {
            await postRef.update({ status: 'approved' });
            console.log(`Post ${postId} approved and live.`);
        }
    } catch (err) {
        console.error("Moderation error:", err);
        // Fail-open or Fail-closed? Usually fail-open (approved) to avoid breaking the app if API is down
        await postRef.update({ status: 'approved' });
    }
});
