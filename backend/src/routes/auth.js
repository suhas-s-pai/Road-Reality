const express = require("express");
const supabase = require("../supabase");
const { requireAuth, authenticateToken } = require("../middleware/auth");

const router = express.Router();

/*
  GET USER PROFILE AND ROLE
  GET /api/auth/profile
*/
router.get("/profile", requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: "Database connection unavailable"
      });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    // Check bootstrap admin email
    const isAdminEmail = Boolean(
      process.env.ADMIN_EMAIL &&
      req.user.email &&
      process.env.ADMIN_EMAIL.toLowerCase() === req.user.email.toLowerCase()
    );

    if (error || !profile) {
      // Return basic user info if profile table isn't populated yet
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split("@")[0],
          full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split("@")[0],
          avatar_url: req.user.user_metadata?.avatar_url || "",
          role: isAdminEmail ? "admin" : "user"
        }
      });
    }

    const effectiveRole = isAdminEmail ? "admin" : (profile.role || "user");

    res.json({
      success: true,
      user: {
        ...profile,
        name: profile.full_name || profile.name || req.user.email.split("@")[0],
        full_name: profile.full_name || profile.name || req.user.email.split("@")[0],
        role: effectiveRole
      }
    });
  } catch (error) {
    console.error("Profile endpoint error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  SYNC / ENSURE USER PROFILE IN DATABASE
  POST /api/auth/sync-profile
*/
router.post("/sync-profile", requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ success: false, message: "Database connection unavailable" });
    }

    const user = req.user;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0];
    const avatar_url = user.user_metadata?.avatar_url || null;
    const isAdminEmail = Boolean(
      process.env.ADMIN_EMAIL &&
      user.email &&
      process.env.ADMIN_EMAIL.toLowerCase() === user.email.toLowerCase()
    );

    // Check existing profile to preserve an existing admin role
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const existingRole = existingProfile?.role || "user";
    const finalRole = isAdminEmail ? "admin" : existingRole;

    const profileData = {
      id: user.id,
      email: user.email,
      name,
      full_name: name,
      avatar_url,
      role: finalRole,
      updated_at: new Date().toISOString()
    };

    let { data: profile, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single();

    // Fallback if full_name or name column is missing in older table schema
    if (error && error.code === "42703") {
      const fallbackData = {
        id: user.id,
        email: user.email,
        name,
        avatar_url,
        role: finalRole
      };
      const retryRes = await supabase
        .from("profiles")
        .upsert(fallbackData, { onConflict: "id" })
        .select()
        .single();

      profile = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.warn("Profile sync warning (schema may need setup):", error.message);
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name,
          full_name: name,
          avatar_url,
          role: finalRole
        }
      });
    }

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    console.error("Sync profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
