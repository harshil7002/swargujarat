export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        try {
            if (url.pathname === "/api/login" && request.method === "POST") {
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
            }
            
            if (url.pathname === "/api/logout" && request.method === "POST") {
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Set-Cookie": `swar_admin_session=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`
                    }
                });
            }
            
            if (url.pathname === "/api/check-auth" && request.method === "GET") {
                const cookieHeader = request.headers.get("Cookie") || "";
                const sessionSecret = env.SESSION_SECRET || "default_insecure_secret_swar_gujarat";
                if (cookieHeader.includes(`swar_admin_session=${sessionSecret}`)) {
                    return new Response(JSON.stringify({ authenticated: true }), {
                        status: 200, headers: { "Content-Type": "application/json" }
                    });
                }
                return new Response(JSON.stringify({ authenticated: false }), {
                    status: 401, headers: { "Content-Type": "application/json" }
                });
            }
            
            if (url.pathname === "/api/songs") {
                const upstashUrl = (env.UPSTASH_URL || "https://integral-puma-108532.upstash.io").replace(/\/$/, "");
                const token = env.UPSTASH_TOKEN || "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
                
                if (request.method === "GET") {
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
                }
                
                if (request.method === "POST") {
                    const cookieHeader = request.headers.get("Cookie") || "";
                    const sessionSecret = env.SESSION_SECRET || "default_insecure_secret_swar_gujarat";
                    if (!cookieHeader.includes(`swar_admin_session=${sessionSecret}`)) {
                        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
                    }
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
                        status: 200, headers: { "Content-Type": "application/json" }
                    });
                }
            }
            
            if (url.pathname === "/api/ping" && request.method === "POST") {
                const upstashUrl = (env.UPSTASH_URL || "https://integral-puma-108532.upstash.io").replace(/\/$/, "");
                const token = env.UPSTASH_TOKEN || "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
                
                const body = await request.json();
                const sessionId = body.sessionId;
                if (!sessionId) return new Response("Invalid session ID", { status: 400 });
                
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
                    headers: { 
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
                    }
                });
            }
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }

        // Serve Static Assets using Workers Assets
        return env.ASSETS.fetch(request);
    }
}
