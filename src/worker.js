export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Intercept the exact API route
    if (url.pathname === '/api/verifyWhopUser') {
      const whopToken = request.headers.get("x-whop-user-token");
      
      if (!whopToken) {
        return new Response(JSON.stringify({ error: "No x-whop-user-token injected by proxy" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const firebaseProjectId = "virality-ede9d";
        const firebaseUrl = `https://us-central1-${firebaseProjectId}.cloudfunctions.net/verifyWhopUser`;

        const firebaseResponse = await fetch(firebaseUrl, {
          method: "GET",
          headers: {
            "x-whop-user-token": whopToken
          }
        });

        const responseText = await firebaseResponse.text();
        
        return new Response(responseText, {
          status: firebaseResponse.status,
          headers: {
            "Content-Type": firebaseResponse.headers.get("Content-Type") || "application/json",
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to connect to Firebase backend" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 2. For all other requests, fall back to serving static assets
    // When using wrangler's new assets binding, we fetch from env.ASSETS
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
