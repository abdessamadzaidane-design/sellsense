// Vercel Serverless Function: Create Stripe Checkout Session
// ZERO external dependencies — uses only Node built-in fetch. No npm install needed.
//
// Contract expected by sellsense-dashboard.html -> beginCheckout(interval):
//   POST /api/create-checkout-session
//   Headers: Authorization: Bearer <supabase_access_token>
//   Body: { interval: 'monthly' | 'annual' }
//   Success 200: { url: "<stripe checkout url>" }   (dashboard redirects to it)
//   Error 4xx/5xx: { error: "<message>" }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const SK = process.env.STRIPE_SECRET_KEY;
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Anon key is the correct key for validating a user's JWT (auth step).
  const SUPA_ANON = process.env.SUPABASE_ANON_KEY || SUPA_KEY;
  const SITE = process.env.SITE_URL || 'https://www.sellsenseapp.com';
  const PRICES = {
    monthly: process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_FOUNDING_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID,
  };

  try {
    // 1. Verify the Supabase session token -> get the user
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Please sign in again.' });

    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPA_ANON },
    });
    if (!userRes.ok) {
      console.error('auth verify failed:', userRes.status, await userRes.text().catch(() => ''));
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    const user = await userRes.json();

    // 2. Resolve price from interval
    const interval = (req.body && req.body.interval) === 'annual' ? 'annual' : 'monthly';
    const priceId = PRICES[interval];
    if (!priceId) return res.status(500).json({ error: 'Price not configured.' });

    // 3. Reuse existing Stripe customer if present
    const profRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${user.id}&select=stripe_customer_id`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const profiles = await profRes.json();
    let customerId = profiles && profiles[0] && profiles[0].stripe_customer_id;

    if (!customerId) {
      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: user.email, 'metadata[supabase_user_id]': user.id }),
      });
      const cust = await custRes.json();
      if (!custRes.ok) return res.status(500).json({ error: cust.error?.message || 'Could not create customer.' });
      customerId = cust.id;
      await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ stripe_customer_id: customerId }),
      });
    }

    // 4. Create the Checkout Session (subscription + 7-day trial)
    const params = new URLSearchParams({
      customer: customerId,
      mode: 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'subscription_data[trial_period_days]': '7',
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][interval]': interval,
      'metadata[supabase_user_id]': user.id,
      'metadata[interval]': interval,
      success_url: `${SITE}/sellsense-dashboard.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/sellsense-dashboard.html?payment=canceled`,
      allow_promotion_codes: 'true',
    });

    const sessRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const sess = await sessRes.json();
    if (!sessRes.ok) return res.status(500).json({ error: sess.error?.message || 'Stripe error.' });

    return res.status(200).json({ url: sess.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
}
