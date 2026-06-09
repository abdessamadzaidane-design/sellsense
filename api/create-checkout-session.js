const {
  authenticatedUser,
  priceId,
  readJson,
  sendJson,
  siteUrl,
  stripeClient,
  supabaseAdmin,
} = require("./_billing");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  try {
    const admin = supabaseAdmin();
    const stripe = stripeClient();
    const user = await authenticatedUser(req, admin);
    if (!user) return sendJson(res, 401, { error: "Please sign in again." });
    const body = await readJson(req);
    const interval = body.interval === "annual" ? "annual" : "monthly";
    const { data: existing } = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (existing && ["active", "trialing"].includes(existing.status) && existing.plan_key === "founding_pro") {
      return sendJson(res, 409, { error: "Pro is already active. Manage it from your billing portal." });
    }
    let customerId = existing && existing.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata && user.user_metadata.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("billing_subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_key: "free",
        status: existing && existing.status ? existing.status : "free",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    }
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId(interval), quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      success_url: `${base}/sellsense-dashboard.html?checkout=success`,
      cancel_url: `${base}/sellsense-dashboard.html?checkout=cancelled`,
      metadata: { user_id: user.id, plan_key: "founding_pro", interval },
      subscription_data: { metadata: { user_id: user.id, plan_key: "founding_pro" } },
    });
    return sendJson(res, 200, { url: session.url });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Stripe checkout is not configured yet." });
  }
};
