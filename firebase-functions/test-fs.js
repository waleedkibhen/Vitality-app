const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'virality-ede9d' });
admin.firestore().collection('posts').orderBy('createdAt', 'desc').limit(1).get().then(snap => {
    snap.forEach(doc => {
        console.log(doc.id);
        console.log(doc.data().createdAt.toDate());
        console.log(doc.data().videoUrl);
    });
    process.exit(0);
});
