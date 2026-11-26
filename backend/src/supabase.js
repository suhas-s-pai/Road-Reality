const path = require("path");
// Try loading backend/.env first, then root .env
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const rawUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
).trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const anonKey = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

// Helper function to validate if a string is a valid HTTP/HTTPS URL
function isValidHttpUrl(string) {
  if (!string) return false;
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// Prefer serviceRoleKey if valid and not an obsolete/placeholder key; fallback to anonKey
const isKnownInvalidKey = serviceRoleKey.includes("dwrMegJ5uOGpMFHOenTXHg") || serviceRoleKey.includes("<actual");
const keyToUse = (!isKnownInvalidKey && serviceRoleKey) ? serviceRoleKey : (anonKey || serviceRoleKey);

let supabase = null;

if (isValidHttpUrl(supabaseUrl) && keyToUse && !keyToUse.includes("YOUR_SUPABASE")) {
  supabase = createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  supabase.getScopedClient = (reqOrToken) => {
    if (!isValidHttpUrl(supabaseUrl) || !anonKey) return supabase;
    let token = typeof reqOrToken === "string" ? reqOrToken : null;
    if (!token && reqOrToken?.headers?.authorization) {
      token = reqOrToken.headers.authorization.replace(/^Bearer\s+/i, "").trim();
    }
    if (!token) return supabase;

    try {
      return createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
    } catch (_) {
      return supabase;
    }
  };
} else {
  console.warn("⚠️  [Supabase Warning]: Missing or placeholder Supabase credentials in .env");
  console.warn("   Please update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env");
}

module.exports = supabase;
