const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function stripeClient() {
  return new Stripe(required("STRIPE_SECRET_KEY"));
}

function supabaseAdmin() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readRaw(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function authenticatedUser(req, admin) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function priceId(interval) {
  if (interval === "annual") return required("STRIPE_FOUNDING_ANNUAL_PRICE_ID");
  return required("STRIPE_FOUNDING_MONTHLY_PRICE_ID");
}

function toIso(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function findUserId(admin, subscription) {
  if (subscription.metadata && subscription.metadata.user_id) return subscription.metadata.user_id;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer && subscription.customer.id;
  if (!customerId) return null;
  const { data } = await admin
    .from("billing_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data && data.user_id;
}

async function syncSubscription(admin, subscription) {
  const userId = await findUserId(admin, subscription);
  if (!userId) throw new Error("Stripe subscription is missing a SellSense user id");
  const { data: entitlement } = await admin
    .from("billing_subscriptions")
    .select("plan_key")
    .eq("user_id", userId)
    .single();
  if (entitlement && entitlement.plan_key === "admin") return entitlement;
  const item = subscription.items && subscription.items.data && subscription.items.data[0];
  const price = item && item.price;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: price ? price.id : null,
    billing_interval: price && price.recurring ? price.recurring.interval : null,
    plan_key: ["active", "trialing", "past_due"].includes(subscription.status) ? "founding_pro" : "free",
    status: subscription.status,
    current_period_end: toIso(subscription.current_period_end || (item && item.current_period_end)),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("billing_subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
  return row;
}

module.exports = {
  authenticatedUser,
  priceId,
  readJson,
  readRaw,
  required,
  sendJson,
  siteUrl,
  stripeClient,
  supabaseAdmin,
  syncSubscription,
};
