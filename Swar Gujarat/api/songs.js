export default async function handler(req, res) {
    // Hardcoded keys for zero-configuration deployment
    const url = "https://integral-puma-108532.upstash.io";
    const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";

    if (!url || !token) {
        return res.status(500).json({ error: 'Database not connected.' });
    }

    try {
        if (req.method === 'GET') {
            const response = await fetch(`${url}/get/swar_playlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            let songs = [];
            if (data.result) {
                songs = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            }
            
            return res.status(200).json(songs);
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const songs = body.songs;
            
            if (!Array.isArray(songs)) {
                return res.status(400).json({ error: 'Invalid data format. Expected an array of songs.' });
            }

            const response = await fetch(`${url}/set/swar_playlist`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(songs)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            return res.status(200).json({ success: true, message: 'Playlist saved to cloud!' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error("Upstash API Error:", error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
