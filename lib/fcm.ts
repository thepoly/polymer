import crypto from 'node:crypto'

/**
 * FCM v1 (HTTP) sender using a service account.
 *
 * Reads `FCM_SERVICE_ACCOUNT_JSON` (the raw JSON string from a Google
 * Cloud service account key with the Firebase Messaging scope).
 * If the env var is missing/unparseable, this is a no-op so the rest
 * of the app can build/deploy without Firebase configured yet.
 */

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
}

export type FcmNotification = {
  title: string
  body: string
  data?: Record<string, string>
}

export type FcmResult = {
  sent: number
  failed: number
  invalidTokens: string[]
}

type CachedToken = {
  accessToken: string
  expiresAt: number // epoch ms
}

let cachedAccessToken: CachedToken | null = null

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.warn('[fcm] FCM_SERVICE_ACCOUNT_JSON missing required fields')
      return null
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      // JSON.parse won't unescape literal \n in the private_key field when
      // the env var was written with escaped newlines; normalize both cases.
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    }
  } catch (err) {
    console.warn('[fcm] Failed to parse FCM_SERVICE_ACCOUNT_JSON', err)
    return null
  }
}

function signJwt(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(sa.private_key)
  return `${signingInput}.${base64url(signature)}`
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Date.now()
  // 60s safety margin
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > now) {
    return cachedAccessToken.accessToken
  }

  const jwt = signJwt(sa)
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  })

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[fcm] OAuth token exchange failed', res.status, text)
      return null
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) {
      console.error('[fcm] OAuth response missing access_token')
      return null
    }
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600
    cachedAccessToken = {
      accessToken: json.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    }
    return json.access_token
  } catch (err) {
    console.error('[fcm] OAuth token exchange threw', err)
    return null
  }
}

type FcmSendOutcome =
  | { status: 'sent' }
  | { status: 'invalid'; token: string }
  | { status: 'failed' }

async function sendOne(
  projectId: string,
  accessToken: string,
  token: string,
  notification: FcmNotification,
): Promise<FcmSendOutcome> {
  const message = {
    message: {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      android: { priority: 'high' as const },
    },
  }
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(message),
      },
    )
    if (res.ok) return { status: 'sent' }

    const bodyText = await res.text().catch(() => '')
    if (res.status === 404 || /UNREGISTERED/i.test(bodyText) || /INVALID_ARGUMENT/i.test(bodyText)) {
      return { status: 'invalid', token }
    }
    console.warn('[fcm] send failed', res.status, bodyText.slice(0, 500))
    return { status: 'failed' }
  } catch (err) {
    console.warn('[fcm] send threw', err)
    return { status: 'failed' }
  }
}

export async function sendFcmToTokens(
  tokens: string[],
  notification: FcmNotification,
): Promise<FcmResult> {
  const sa = loadServiceAccount()
  if (!sa) {
    console.warn('[fcm] FCM_SERVICE_ACCOUNT_JSON not configured; skipping send')
    return { sent: 0, failed: 0, invalidTokens: [] }
  }
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] }
  }

  const accessToken = await getAccessToken(sa)
  if (!accessToken) {
    return { sent: 0, failed: tokens.length, invalidTokens: [] }
  }

  const result: FcmResult = { sent: 0, failed: 0, invalidTokens: [] }
  const chunkSize = 100
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const slice = tokens.slice(i, i + chunkSize)
    const outcomes = await Promise.all(
      slice.map((token) => sendOne(sa.project_id, accessToken, token, notification)),
    )
    for (const outcome of outcomes) {
      if (outcome.status === 'sent') result.sent += 1
      else if (outcome.status === 'invalid') {
        result.failed += 1
        result.invalidTokens.push(outcome.token)
      } else {
        result.failed += 1
      }
    }
  }
  return result
}
