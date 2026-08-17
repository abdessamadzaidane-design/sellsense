// Vercel Serverless Function: Stripe Webhook
// ZERO external dependencies — uses only Node built-ins (crypto + fetch). No npm install needed.
//
// Stripe Dashboard -> Developers -> Webhooks endpoint:
//   URL: https://www.sellsenseapp.com/api/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted, invoice.payment_failed

import { createHmac, timingSafeEqual } from 'crypto';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = {};
  for (const kv of header.split(',')) {
    const i = kv.indexOf('=');
    if (i > -1) parts[kv.slice(0, i)] = kv.slice(i + 1);
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject events older than 5 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - parseInt(t, 10)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest();
  const given = Buffer.from(v1, 'hex');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const SK = process.env.STRIPE_SECRET_KEY;
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;

  const raw = await readRawBody(req);
  const rawStr = raw.toString('utf8');

  if (!verifyStripeSignature(rawStr, req.headers['stripe-signature'], WHSEC)) {
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawStr);
  } catch {
    return res.status(400).send('Invalid payload');
  }

  async function setSub(customerId, fields) {
    await fetch(`${SUPA_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    });
  }

  try {
    const obj = event.data.object;

    if (event.type === 'checkout.session.completed' && obj.mode === 'subscription') {
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${obj.subscription}`, {
        headers: { Authorization: `Bearer ${SK}` },
      });
      const sub = await subRes.json();
      await setSub(obj.customer, {
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        plan: sub.items.data[0].price.recurring.interval === 'year' ? 'annual' : 'monthly',
        subscription_updated_at: new Date().toISOString(),
      });
    } else if (event.type === 'customer.subscription.updated') {
      await setSub(obj.customer, {
        subscription_status: obj.status,
        subscription_cancel_at: obj.cancel_at ? new Date(obj.cancel_at * 1000).toISOString() : null,
        plan: obj.items.data[0].price.recurring.interval === 'year' ? 'annual' : 'monthly',
        subscription_updated_at: new Date().toISOString(),
      });
    } else if (event.type === 'customer.subscription.deleted') {
      await setSub(obj.customer, {
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        plan: 'free',
        subscription_updated_at: new Date().toISOString(),
      });
    } else if (event.type === 'invoice.payment_failed') {
      await setSub(obj.customer, {
        subscription_status: 'past_due',
        subscription_updated_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }
}
