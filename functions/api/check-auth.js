export async function onRequestGet(context) {
    const { request, env } = context;
    const cookieHeader = request.headers.get("Cookie") || "";
    const sessionSecret = env.SESSION_SECRET || "default_insecure_secret_swar_gujarat";
    
    if (cookieHeader.includes(`swar_admin_session=${sessionSecret}`)) {
        return new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
    });
}
