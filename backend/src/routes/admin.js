const express = require("express");
const supabase = require("../supabase");
const { getReportsTable } = require("../dbUtils");
const { requireAdmin } = require("../middleware/auth");
const {
  listAdmins,
  getInvitations,
  getAuditLogs,
  addOrInviteAdmin,
  removeAdmin,
  cancelInvitation
} = require("../adminManagement");

const router = express.Router();

// Helper to check database configuration
const checkSupabaseConfigured = (res) => {
  if (!supabase) {
    res.status(503).json({
      success: false,
      message: "Database connection unavailable."
    });
    return false;
  }
  return true;
};

/*
  ADMIN DASHBOARD OVERVIEW STATISTICS
  GET /api/admin/stats
*/
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    // 1. Total Users Count
    const { count: totalUsers, error: usersErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (usersErr) console.warn("Error fetching user count:", usersErr);

    // 2. Hazard Reports Statistics
    const tableName = await getReportsTable();
    const { data: reports, error: reportsErr } = await supabase
      .from(tableName)
      .select("status");

    if (reportsErr) {
      console.error("Error fetching reports for stats:", reportsErr);
      return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
    }

    const reportsList = reports || [];
    const totalReports = reportsList.length;
    const reported = reportsList.filter(r => (r.status || "").toUpperCase() === "REPORTED").length;
    const verified = reportsList.filter(r => (r.status || "").toUpperCase() === "VERIFIED").length;
    const inProgress = reportsList.filter(r => (r.status || "").toUpperCase() === "IN_PROGRESS").length;
    const resolved = reportsList.filter(r => (r.status || "").toUpperCase() === "RESOLVED").length;

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalReports,
        newReports: reported,
        awaitingVerification: reported,
        verifiedReports: verified,
        inProgressReports: inProgress,
        resolvedReports: resolved,
        activeReports: reported + verified + inProgress
      }
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  LIST ALL REGISTERED USERS WITH REPORT COUNTS
  GET /api/admin/users
*/
router.get("/users", requireAdmin, async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    // Fetch all profiles
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesErr) {
      console.error("Error fetching profiles:", profilesErr);
      return res.status(500).json({ success: false, message: "Failed to fetch registered users" });
    }

    // Fetch all reports to aggregate report counts per user
    const tableName = await getReportsTable();
    const { data: reports } = await supabase
      .from(tableName)
      .select("user_id");

    const reportCountMap = {};
    if (reports) {
      reports.forEach(r => {
        if (r.user_id) {
          reportCountMap[r.user_id] = (reportCountMap[r.user_id] || 0) + 1;
        }
      });
    }

    const formattedUsers = (profiles || []).map(p => ({
      id: p.id,
      email: p.email,
      name: p.full_name || p.name || (p.email ? p.email.split("@")[0] : "User"),
      full_name: p.full_name || p.name || (p.email ? p.email.split("@")[0] : "User"),
      avatar_url: p.avatar_url || "",
      role: p.role || "user",
      created_at: p.created_at || new Date().toISOString(),
      reportCount: reportCountMap[p.id] || 0
    }));

    res.json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch (err) {
    console.error("Admin list users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  LIST ALL REPORTS WITH FULL REPORTER DETAILS (ADMIN ONLY)
  GET /api/admin/reports
*/
router.get("/reports", requireAdmin, async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data: reports, error: reportsErr } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsErr) {
      console.error("Error fetching reports for admin:", reportsErr);
      return res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }

    // Fetch all profiles to attach reporter identity
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, full_name, email, avatar_url");

    const profileMap = {};
    (profiles || []).forEach(p => {
      profileMap[p.id] = p;
    });

    const enrichedReports = (reports || []).map(r => {
      const p = r.user_id ? profileMap[r.user_id] : null;
      return {
        ...r,
        reporter: p
          ? {
              id: p.id,
              name: p.full_name || p.name || p.email?.split("@")[0] || "Registered User",
              email: p.email || "Not specified",
              avatar_url: p.avatar_url || ""
            }
          : {
              name: "Anonymous Citizen",
              email: "Not provided",
              avatar_url: ""
            }
      };
    });

    res.json({
      success: true,
      count: enrichedReports.length,
      reports: enrichedReports
    });
  } catch (err) {
    console.error("Admin list reports error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  UPDATE REPORT (STATUS, ASSIGNMENT, NOTES) (ADMIN ONLY)
  PUT /api/admin/reports/:id
*/
router.put("/reports/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, admin_notes, notes } = req.body;

    if (!checkSupabaseConfigured(res)) return;

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      const allowed = ["REPORTED", "VERIFIED", "IN_PROGRESS", "RESOLVED"];
      const norm = status.toUpperCase();
      if (!allowed.includes(norm)) {
        return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(", ")}` });
      }
      updatePayload.status = norm;
    }

    if (assigned_to !== undefined) updatePayload.assigned_to = assigned_to;

    const notesToSave = admin_notes !== undefined ? admin_notes : notes;
    if (notesToSave !== undefined) updatePayload.admin_notes = notesToSave;

    const tableName = await getReportsTable();
    let { data, error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error && error.message && error.message.toLowerCase().includes("admin_notes")) {
      delete updatePayload.admin_notes;
      const retry = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return res.status(404).json({ success: false, message: "Failed to update report" });
    }

    res.json({
      success: true,
      message: "Report updated successfully",
      report: data
    });
  } catch (err) {
    console.error("Admin update report error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  PROMOTE OR DEMOTE USER ROLE (ADMIN ONLY)
  POST /api/admin/users/:id/role
  Body: { role: "admin" | "user" }
*/
router.post("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'admin' or 'user'."
      });
    }

    if (!checkSupabaseConfigured(res)) return;

    // Check target user profile
    const { data: targetProfile, error: targetErr } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", id)
      .single();

    if (targetErr || !targetProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    // Protection rule: Prevent demoting the last remaining admin
    if (targetProfile.role === "admin" && role === "user") {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (adminProfiles && adminProfiles.length <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot remove admin privileges from the last remaining administrator."
        });
      }
    }

    // Update role using backend service-role privileges
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Role update error:", updateErr);
      return res.status(500).json({
        success: false,
        message: "Failed to update user role."
      });
    }

    res.json({
      success: true,
      message: `User role successfully updated to '${role}'`,
      user: updated
    });
  } catch (err) {
    console.error("Admin role change error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
  ==============================================================================
  ADMIN MANAGEMENT API ENDPOINTS
  ==============================================================================
*/

/**
 * GET /api/admin/management
 * Fetches all active admins, pending invitations, and recent audit logs
 */
router.get("/management", requireAdmin, async (req, res) => {
  try {
    const [admins, invitations, auditLogs] = await Promise.all([
      listAdmins(),
      getInvitations(),
      getAuditLogs(50)
    ]);

    res.json({
      success: true,
      admins: admins || [],
      invitations: invitations || [],
      auditLogs: auditLogs || []
    });
  } catch (err) {
    console.error("[Admin Management] Error loading data:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load admin management data."
    });
  }
});

/**
 * POST /api/admin/management/add
 * Add or invite an administrator by email and name
 */
router.post("/management/add", requireAdmin, async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required."
      });
    }

    const result = await addOrInviteAdmin({
      email,
      fullName: fullName ? fullName.trim() : "",
      actorUser: req.user
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("[Admin Management] Error adding admin:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process administrator addition."
    });
  }
});

/**
 * POST /api/admin/management/remove
 * Remove/demote an administrator
 */
router.post("/management/remove", requireAdmin, async (req, res) => {
  try {
    const { id, email } = req.body;

    if (!id && !email) {
      return res.status(400).json({
        success: false,
        message: "Target administrator ID or email is required."
      });
    }

    const result = await removeAdmin({
      targetId: id,
      targetEmail: email,
      actorUser: req.user
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("[Admin Management] Error removing admin:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to remove administrator."
    });
  }
});

/**
 * DELETE /api/admin/management/invitations/:id
 * Revoke/cancel a pending admin invitation
 */
router.delete("/management/invitations/:id", requireAdmin, async (req, res) => {
  try {
    const invitationId = req.params.id;

    const result = await cancelInvitation({
      invitationId,
      actorUser: req.user
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("[Admin Management] Error cancelling invitation:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to cancel invitation."
    });
  }
});

module.exports = router;
