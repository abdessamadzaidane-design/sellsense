const {
  readRaw,
  required,
  sendJson,
  stripeClient,
  supabaseAdmin,
  syncSubscription,
} = require("./_billing");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const stripe = stripeClient();
  const admin = supabaseAdmin();
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], required("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid Stripe webhook signature." });
  }

  const { error: eventError } = await admin.from("stripe_webhook_events").insert({ event_id: event.id });
  if (eventError && eventError.code === "23505") return sendJson(res, 200, { received: true, duplicate: true });
  if (eventError) return sendJson(res, 500, { error: "Could not record webhook event." });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        if (!subscription.metadata.user_id && session.metadata && session.metadata.user_id) {
          subscription.metadata.user_id = session.metadata.user_id;
        }
        await syncSubscription(admin, subscription);
      }
    }
    if ([
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)) {
      await syncSubscription(admin, event.data.object);
    }
    await admin.from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error(error);
    await admin.from("stripe_webhook_events").delete().eq("event_id", event.id);
    return sendJson(res, 500, { error: "Webhook processing failed." });
  }
};

module.exports.config = { api: { bodyParser: false } };
