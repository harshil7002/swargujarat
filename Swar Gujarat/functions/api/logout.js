export async function onRequestPost() {
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `swar_admin_session=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`
        }
    });
}
