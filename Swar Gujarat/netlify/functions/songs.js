exports.handler = async (event, context) => {
    // Hardcoded keys for zero-configuration Netlify deployment
    const url = "https://integral-puma-108532.upstash.io";
    const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";

    if (!url || !token) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database not connected.' })
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            const response = await fetch(`${url}/get/swar_playlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            let songs = [];
            if (data.result) {
                songs = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            }
            
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(songs)
            };
        }

        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const songs = body.songs;
            
            if (!Array.isArray(songs)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid data format. Expected an array of songs.' })
                };
            }

            const response = await fetch(`${url}/set/swar_playlist`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                // We stringify the payload that goes to KV
                body: JSON.stringify(songs)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true, message: 'Playlist saved to cloud!' })
            };
        }
        
        return { statusCode: 405, body: 'Method not allowed' };
        
    } catch (error) {
        console.error("Upstash API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
