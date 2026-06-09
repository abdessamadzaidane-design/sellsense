const {
  authenticatedUser,
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
    const { data } = await admin
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();
    if (!data || !data.stripe_customer_id) {
      return sendJson(res, 404, { error: "No Stripe billing account exists yet." });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl(req)}/sellsense-dashboard.html`,
    });
    return sendJson(res, 200, { url: session.url });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "The billing portal is not configured yet." });
  }
};
