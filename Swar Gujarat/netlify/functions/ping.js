exports.handler = async (event, context) => {
    const url = "https://integral-puma-108532.upstash.io";
    const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";

    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

    try {
        const body = JSON.parse(event.body);
        const sessionId = body.sessionId;
        if (!sessionId) return { statusCode: 400, body: 'Missing sessionId' };

        const now = Date.now();
        // Remove users who haven't pinged in the last 45 seconds
        const expireTime = now - 45000; 

        // Use Upstash Pipeline to run 3 commands in 1 fast request
        const pipeline = [
            ["ZADD", "active_users", now.toString(), sessionId],
            ["ZREMRANGEBYSCORE", "active_users", "-inf", expireTime.toString()],
            ["ZCARD", "active_users"]
        ];

        const response = await fetch(`${url}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(pipeline)
        });

        const results = await response.json();
        
        // results[2] is the response from the ZCARD command
        let activeCount = 1;
        if (Array.isArray(results) && results[2] && results[2].result !== undefined) {
            activeCount = results[2].result;
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: activeCount })
        };
    } catch (e) {
        console.error("Ping Error:", e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
