// Sends a Web Push notification to all subscribed devices for the calling user.
// Uses pure-Deno VAPID JWT + ECDH AES-GCM per RFC 8291 / RFC 8030.
// Triggered by: client (test push) OR pg_cron via send-push-cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC = 'BNNfYp1EFnTGtRy9YQiIDs49oMebNTrhOGZja-48yK-4eKaeHG6BaGgKkEQI6qGmORGUqSP0T5wKQ2jA_iKEfgg';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@arux.app';

// ---------- Base64URL helpers ----------
function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToBytes(s: string): Uint8Array { return new TextEncoder().encode(s); }
function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

// ---------- VAPID JWT ----------
async function importVapidPrivateKey(): Promise<CryptoKey> {
  const d = b64urlToBytes(VAPID_PRIVATE);
  const x_y = b64urlToBytes(VAPID_PUBLIC).slice(1); // drop 0x04 prefix
  const x = x_y.slice(0, 32);
  const y = x_y.slice(32, 64);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d: bytesToB64url(d), x: bytesToB64url(x), y: bytesToB64url(y),
    ext: true,
  };
  return await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function buildVapidJWT(audience: string): Promise<string> {
  const key = await importVapidPrivateKey();
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  };
  const headerB64 = bytesToB64url(strToBytes(JSON.stringify(header)));
  const payloadB64 = bytesToB64url(strToBytes(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, strToBytes(signingInput));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

// ---------- ECDH + HKDF + AES-GCM (aes128gcm content-encoding, RFC 8188) ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey, length * 8
  );
  return new Uint8Array(bits);
}

async function encryptPayload(
  payload: string,
  receiverP256dh: string, // base64url uncompressed point
  receiverAuth: string,    // base64url 16 bytes
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const recvPub = b64urlToBytes(receiverP256dh);
  const auth = b64urlToBytes(receiverAuth);

  // 1. Generate ephemeral local key pair
  const localKp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKp.publicKey));

  // 2. Import recipient public key
  const recipientPubKey = await crypto.subtle.importKey(
    'raw', recvPub,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // 3. ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientPubKey },
    localKp.privateKey, 256
  );
  const ecdhSecret = new Uint8Array(sharedBits);

  // 4. PRK = HKDF(auth, ecdhSecret, "WebPush: info\0" + recvPub + localPub, 32)
  const keyInfo = concat(strToBytes('WebPush: info\0'), recvPub, localPubRaw);
  const prk = await hkdf(auth, ecdhSecret, keyInfo, 32);

  // 5. salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. Content Encryption Key + Nonce
  const cek = await hkdf(salt, prk, concat(strToBytes('Content-Encoding: aes128gcm\0')), 16);
  const nonce = await hkdf(salt, prk, concat(strToBytes('Content-Encoding: nonce\0')), 12);

  // 7. Pad + encrypt: payload || 0x02 (single record)
  const plaintext = concat(strToBytes(payload), new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );

  // 8. Build aes128gcm header: salt(16) || rs(4 BE) || idlen(1) || keyid(localPubRaw)
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([localPubRaw.length]);
  const header = concat(salt, rs, idlen, localPubRaw);
  const body = concat(header, ciphertext);

  return { body, salt, localPublicKey: localPubRaw };
}

async function sendOnePush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJWT(audience);
  const { body, localPublicKey } = await encryptPayload(payload, p256dh, auth);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
      'Urgency': 'high',
    },
    body,
  });
  // Always consume body to avoid leaks
  await res.arrayBuffer();
  return { ok: res.ok, status: res.status };
}

interface SendPushBody {
  test?: boolean;
  userId?: string; // when called by cron with service role, allows specifying user
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const body: SendPushBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    let targetUserId: string | null = null;

    if (authHeader === `Bearer ${SERVICE_KEY}`) {
      // Trusted internal caller (cron / other edge functions using service role)
      targetUserId = body.userId ?? null;
    } else if (authHeader) {
      // User-initiated (test push) — may only notify themselves
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'No user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No devices' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title: body.title || 'ARUX',
      body: body.body || 'You have a notification',
      url: body.url || '/',
      tag: body.tag || `arux-${Date.now()}`,
    });

    let sent = 0, failed = 0;
    const expired: string[] = [];
    for (const s of subs) {
      try {
        const r = await sendOnePush(s.endpoint, s.p256dh, s.auth, payload);
        if (r.ok) sent++;
        else {
          failed++;
          if (r.status === 404 || r.status === 410) expired.push(s.id);
        }
      } catch (e) {
        console.error('Push failed', e);
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', expired);
    }

    return new Response(JSON.stringify({ sent, failed, expired: expired.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
