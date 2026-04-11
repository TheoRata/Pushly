import { Router } from 'express'
import { orgLoginSfdxUrl } from '../services/sf-cli.js'

const router = Router()

/**
 * GET /api/oauth/status — check if OAuth is configured
 */
router.get('/status', (_req, res) => {
  res.json({ configured: !!process.env.SF_CLIENT_ID })
})

/**
 * GET /api/oauth/authorize — build the Salesforce OAuth authorize URL
 * Query params: type (sandbox|production), alias, customDomain (optional)
 */
router.get('/authorize', (req, res) => {
  const { type, alias, customDomain } = req.query

  const clientId = process.env.SF_CLIENT_ID
  const callbackUrl = process.env.SF_CALLBACK_URL || 'http://localhost:3000/api/oauth/callback'

  if (!clientId) {
    return res.json({
      error: 'not_configured',
      message: 'SF_CLIENT_ID is not set. Create a Connected App in Salesforce Setup > App Manager and add SF_CLIENT_ID and SF_CLIENT_SECRET to your .env file.',
    })
  }

  if (!alias || !type) {
    return res.status(400).json({ error: 'alias and type query params are required' })
  }

  // Determine the authorize endpoint base URL
  let baseUrl
  if (customDomain && customDomain.trim()) {
    let domain = customDomain.trim()
    if (!domain.startsWith('http')) domain = `https://${domain}`
    domain = domain.replace(/\/+$/, '')
    baseUrl = `${domain}/services/oauth2/authorize`
  } else if (type === 'sandbox') {
    baseUrl = 'https://test.salesforce.com/services/oauth2/authorize'
  } else {
    baseUrl = 'https://login.salesforce.com/services/oauth2/authorize'
  }

  // Encode state as URL-safe base64 JSON
  const state = Buffer.from(JSON.stringify({ alias, type })).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'api refresh_token',
    state,
  })

  res.json({ url: `${baseUrl}?${params.toString()}` })
})

/**
 * GET /api/oauth/callback — Salesforce redirects here after user authorizes
 * Exchanges the authorization code for tokens, registers the org with SF CLI,
 * and returns an HTML page that postMessages back to the opener window.
 */
router.get('/callback', async (req, res) => {
  const { code, state, error: oauthError, error_description: oauthErrorDesc } = req.query

  // Handle Salesforce-side errors (user denied, etc.)
  if (oauthError) {
    return res.send(errorPage(oauthErrorDesc || oauthError))
  }

  if (!code || !state) {
    return res.send(errorPage('Missing code or state parameter from Salesforce.'))
  }

  // Decode state
  let alias, type
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    alias = decoded.alias
    type = decoded.type
  } catch {
    return res.send(errorPage('Invalid state parameter. Please try again.'))
  }

  // Determine the token endpoint
  let tokenUrl
  if (type === 'sandbox') {
    tokenUrl = 'https://test.salesforce.com/services/oauth2/token'
  } else {
    tokenUrl = 'https://login.salesforce.com/services/oauth2/token'
  }

  const clientId = process.env.SF_CLIENT_ID
  const clientSecret = process.env.SF_CLIENT_SECRET
  const callbackUrl = process.env.SF_CALLBACK_URL || 'http://localhost:3000/api/oauth/callback'

  if (!clientId || !clientSecret) {
    return res.send(errorPage('Server misconfigured: SF_CLIENT_ID or SF_CLIENT_SECRET is missing.'))
  }

  // Exchange authorization code for tokens
  let tokenData
  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }).toString(),
    })

    tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error_description || tokenData.error || 'Token exchange failed'
      return res.send(errorPage(msg))
    }
  } catch (err) {
    return res.send(errorPage(`Token exchange request failed: ${err.message}`))
  }

  const { access_token, refresh_token, instance_url } = tokenData

  if (!refresh_token) {
    return res.send(errorPage('No refresh token received. Ensure your Connected App has the "refresh_token" scope enabled.'))
  }

  // Build the SFDX auth URL
  // Format: force://<clientId>:<clientSecret>:<refreshToken>@<instanceHost>
  let instanceHost
  try {
    instanceHost = new URL(instance_url).hostname
  } catch {
    return res.send(errorPage('Invalid instance_url received from Salesforce.'))
  }

  const sfdxAuthUrl = `force://${clientId}:${clientSecret}:${refresh_token}@${instanceHost}`

  // Register the org with SF CLI
  try {
    await orgLoginSfdxUrl(alias, sfdxAuthUrl)
  } catch (err) {
    return res.send(errorPage(`Failed to register org with SF CLI: ${err.message}`))
  }

  // Success — return HTML that communicates back to the opener
  res.send(successPage(alias))
})

/**
 * Returns an HTML page that postMessages success to the opener and closes itself.
 */
function successPage(alias) {
  const safeAlias = escapeHtml(alias)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pushly — Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #171717; color: #e5e5e5;
    }
    .card {
      text-align: center; padding: 2rem;
      background: rgba(255,255,255,0.05); border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .check { font-size: 3rem; margin-bottom: 0.5rem; }
    h2 { margin: 0 0 0.5rem; color: #4ade80; }
    p { color: #a3a3a3; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h2>Connected</h2>
    <p>Org <strong>${safeAlias}</strong> authenticated successfully.</p>
    <p style="margin-top: 1rem; font-size: 0.85rem;">You can close this window.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth-success', alias: ${JSON.stringify(alias)} }, '*');
    }
    window.close();
  </script>
</body>
</html>`
}

/**
 * Returns an HTML page that postMessages an error to the opener and shows the error.
 */
function errorPage(message) {
  const safeMessage = escapeHtml(message)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pushly — Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #171717; color: #e5e5e5;
    }
    .card {
      text-align: center; padding: 2rem; max-width: 480px;
      background: rgba(255,255,255,0.05); border-radius: 12px;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .icon { font-size: 3rem; margin-bottom: 0.5rem; }
    h2 { margin: 0 0 0.5rem; color: #ef4444; }
    p { color: #a3a3a3; margin: 0; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10007;</div>
    <h2>Connection Failed</h2>
    <p>${safeMessage}</p>
    <p style="margin-top: 1rem; font-size: 0.85rem;">You can close this window and try again.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth-error', error: ${JSON.stringify(message)} }, '*');
    }
  </script>
</body>
</html>`
}

/**
 * Basic HTML escaping to prevent XSS in rendered messages.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default router
