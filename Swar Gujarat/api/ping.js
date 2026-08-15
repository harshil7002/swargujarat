export default async function handler(req, res) {
    const url = "https://integral-puma-108532.upstash.io";
    const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const sessionId = body.sessionId;
        if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

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

        return res.status(200).json({ active: activeCount });
    } catch (e) {
        console.error("Ping Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
