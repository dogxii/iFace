/**
 * Vercel Serverless Function: GitHub OAuth code → token proxy
 *
 * GitHub OAuth requires client_secret which must NEVER be in frontend code.
 * This tiny function runs server-side and exchanges the `code` for an
 * `access_token`, then redirects back to the app with the token in the
 * URL hash (handled entirely client-side, never logged).
 *
 * Environment variables required (set in Vercel project settings):
 *   GITHUB_CLIENT_ID     — your GitHub OAuth App client ID
 *   GITHUB_CLIENT_SECRET — your GitHub OAuth App client secret
 *   APP_ORIGIN           — e.g. https://iface.vercel.app  (no trailing slash)
 */

export default async function handler(req, res) {
  // ── CORS pre-flight ────────────────────────────────────────────────────────
  const origin = process.env.APP_ORIGIN || ''

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state } = req.query

  if (!code) {
    return res.status(400).json({ error: 'Missing OAuth code' })
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[auth] Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET env vars')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  try {
    // ── Exchange code for token ──────────────────────────────────────────────
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[auth] GitHub token endpoint returned', tokenRes.status)
      return redirectError(res, origin, 'github_error')
    }

    const data = await tokenRes.json()

    if (data.error || !data.access_token) {
      console.error('[auth] GitHub returned error:', data.error, data.error_description)
      return redirectError(res, origin, data.error || 'no_token')
    }

    // Only accept tokens with the gist scope
    const scopes = (data.scope || '').split(',').map((s) => s.trim())
    if (!scopes.includes('gist')) {
      return redirectError(res, origin, 'missing_gist_scope')
    }

    // ── Redirect back to app with token in hash ─────────────────────────────
    // We put the token in the URL hash — it is never sent to the server and
    // never appears in server logs.
    const redirectUrl = new URL('/?auth=success', origin)
    redirectUrl.hash =
      `token=${encodeURIComponent(data.access_token)}` +
      (state ? `&state=${encodeURIComponent(state)}` : '')

    return res.redirect(302, redirectUrl.toString())
  } catch (err) {
    console.error('[auth] Unexpected error:', err)
    return redirectError(res, origin, 'internal_error')
  }
}

function redirectError(res, origin, errorCode) {
  const url = new URL('/?auth=error', origin)
  url.searchParams.set('reason', errorCode)
  return res.redirect(302, url.toString())
}
