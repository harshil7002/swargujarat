export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        
        const validId = env.ADMIN_ID || "Harshil";
        const validPass = env.ADMIN_PASS || "Harshil@1202";
        const sessionSecret = env.SESSION_SECRET || "default_insecure_secret_swar_gujarat";

        if (body.id === validId && body.pass === validPass) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Set-Cookie": `swar_admin_session=${sessionSecret}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=Lax`
                }
            });
        }
        
        return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), { 
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: "Bad request" }), { status: 400 });
    }
}
