export async function onRequestPost(context) {
    const { request, env } = context;
    const upstashUrl = env.UPSTASH_URL || "https://integral-puma-108532.upstash.io";
    const token = env.UPSTASH_TOKEN || "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
    
    try {
        const body = await request.json();
        const sessionId = body.sessionId;
        
        if (!sessionId || typeof sessionId !== "string" || sessionId.length > 50) {
            return new Response("Invalid session ID", { status: 400 });
        }
        
        const now = Date.now();
        const expireTime = now - 45000;
        
        const pipeline = [
            ["ZADD", "active_users", now.toString(), sessionId],
            ["ZREMRANGEBYSCORE", "active_users", "-inf", expireTime.toString()],
            ["ZCARD", "active_users"]
        ];
        
        const res = await fetch(`${upstashUrl}/pipeline`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(pipeline)
        });
        
        const results = await res.json();
        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Ping failed" }), { status: 500 });
    }
}
