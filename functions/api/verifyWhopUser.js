/**
 * Cloudflare Pages Function Proxy
 * This intercepts requests on the same origin (virality-app.wisecrafts81.workers.dev/api/verifyWhopUser).
 * Because it's on the same origin, Whop's reverse proxy will inject the `x-whop-user-token` header here!
 */
export async function onRequest(context) {
  const { request, env } = context;

  // 1. Extract the secret token injected by Whop's proxy
  const whopToken = request.headers.get("x-whop-user-token");

  // In local development, the Vite proxy might pass dev_mock_token.
  // The whop-apps dev-proxy injects x-whop-user-token as well.
  if (!whopToken) {
    return new Response(JSON.stringify({ error: "No x-whop-user-token injected by proxy" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 2. Forward the request to our Firebase Cloud Function backend securely
    const firebaseProjectId = "virality-ede9d";
    const firebaseUrl = `https://us-central1-${firebaseProjectId}.cloudfunctions.net/verifyWhopUser`;

    const firebaseResponse = await fetch(firebaseUrl, {
      method: "GET",
      headers: {
        // Forward the token in the header as expected by the Firebase function
        "x-whop-user-token": whopToken
      }
    });

    // 3. Return the exact response from Firebase back to the React app
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
