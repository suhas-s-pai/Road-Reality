const express = require("express");
const supabase = require("../supabase");
const { requireAuth, authenticateToken } = require("../middleware/auth");
const { claimPendingInvitation } = require("../adminManagement");

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

    // Check and claim any pending admin invitation for this email
    if (req.user.email) {
      try {
        await claimPendingInvitation(req.user.email, req.user.id);
      } catch (e) {
        console.warn("[Auth API] Error checking pending invitation:", e.message);
      }
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      // Return basic user info if profile table isn't populated yet
      const isBootstrapAdmin = Boolean(
        process.env.ADMIN_EMAIL &&
        req.user.email &&
        process.env.ADMIN_EMAIL.toLowerCase() === req.user.email.toLowerCase()
      );

      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split("@")[0],
          full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email.split("@")[0],
          avatar_url: req.user.user_metadata?.avatar_url || "",
          role: isBootstrapAdmin ? "admin" : "user"
        }
      });
    }

    // Database role is authoritative
    const effectiveRole = profile.role || "user";

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

    // Check and claim any pending admin invitation
    let inviteClaimed = false;
    if (user.email) {
      try {
        inviteClaimed = await claimPendingInvitation(user.email, user.id);
      } catch (e) {
        console.warn("[Auth API] Error checking pending invitation on sync:", e.message);
      }
    }

    // Check existing profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let finalRole = "user";
    if (inviteClaimed) {
      finalRole = "admin";
    } else if (existingProfile && existingProfile.role) {
      // Authoritative: Preserve whatever role is already in the database (admin or user)
      finalRole = existingProfile.role;
    } else {
      // New user: check if bootstrap admin email when no profile exists
      const isBootstrapAdmin = Boolean(
        process.env.ADMIN_EMAIL &&
        user.email &&
        process.env.ADMIN_EMAIL.toLowerCase() === user.email.toLowerCase()
      );
      finalRole = isBootstrapAdmin ? "admin" : "user";
    }

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

    // Fallback if full_name column is missing in older table schema
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
      console.warn("Profile sync warning:", error.message);
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
