export async function onRequestGet(context) {
    const { env } = context;
    const upstashUrl = (env.UPSTASH_URL || "https://integral-puma-108532.upstash.io").replace(/\/$/, '');
    const token = env.UPSTASH_TOKEN || "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
    
    try {
        const response = await fetch(`${upstashUrl}/get/swar_playlist`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store"
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Check Auth
    const cookieHeader = request.headers.get("Cookie") || "";
    const sessionSecret = env.SESSION_SECRET || "default_insecure_secret_swar_gujarat";
    
    if (!cookieHeader.includes(`swar_admin_session=${sessionSecret}`)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    // Save to Upstash
    const upstashUrl = (env.UPSTASH_URL || "https://integral-puma-108532.upstash.io").replace(/\/$/, '');
    const token = env.UPSTASH_TOKEN || "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
    
    try {
        const body = await request.text();
        const response = await fetch(`${upstashUrl}/set/swar_playlist`, {
            method: "POST",
            headers: { 
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: body
        });
        
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
    }
}
