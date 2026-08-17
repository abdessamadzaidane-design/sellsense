// Vercel Serverless Function: Create Stripe Billing Portal Session
// ZERO external dependencies — uses only Node built-in fetch. No npm install needed.
//
// Contract expected by sellsense-dashboard.html -> openBillingPortal():
//   POST /api/create-portal-session
//   Headers: Authorization: Bearer <supabase_access_token>
//   Body: {} (optional)
//   Success 200: { url: "<stripe billing portal url>" }  (dashboard redirects to it)
//   Error 4xx/5xx: { error: "<message>" }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const SK = process.env.STRIPE_SECRET_KEY;
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPA_ANON = process.env.SUPABASE_ANON_KEY || SUPA_KEY;
  const SITE = process.env.SITE_URL || 'https://www.sellsenseapp.com';

  try {
    // 1. Verify the Supabase session token -> get the user
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    const userResp = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    const user = await userResp.json();

    // 2. Look up the user's Stripe customer id
    const billingResp = await fetch(
      `${SUPA_URL}/rest/v1/billing_subscriptions?select=stripe_customer_id&user_id=eq.${user.id}&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!billingResp.ok) {
      return res.status(500).json({ error: 'Could not load your billing account.' });
    }
    const rows = await billingResp.json();
    const customerId = Array.isArray(rows) && rows[0] ? rows[0].stripe_customer_id : null;
    if (!customerId) {
      return res.status(404).json({ error: 'No Stripe billing account exists yet.' });
    }

    // 3. Create the Stripe billing portal session
    const form = new URLSearchParams();
    form.set('customer', customerId);
    form.set('return_url', `${SITE}/sellsense-dashboard.html`);
    const portalResp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SK}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const portal = await portalResp.json();
    if (!portalResp.ok) {
      console.error('Stripe portal error:', JSON.stringify(portal).slice(0, 300));
      return res.status(500).json({ error: 'The billing portal is not configured yet.' });
    }
    return res.status(200).json({ url: portal.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'The billing portal is not configured yet.' });
  }
}
