const express = require("express");
const supabase = require("../supabase");
const { getReportsTable } = require("../dbUtils");
const { authenticateToken, requireAuth, requireAdmin } = require("../middleware/auth");
const { sendAuthorityReportNotification } = require("../services/emailService");

const router = express.Router();

// Helper to check if Supabase client is configured
const checkSupabaseConfigured = (res) => {
  if (!supabase) {
    res.status(503).json({
      success: false,
      message: "Database connection unavailable. Please set valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
    });
    return false;
  }
  return true;
};

// Helper: Haversine distance in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/*
  GET NEARBY HAZARD REPORTS
  GET /api/reports/nearby?lat=...&lng=...&radius=...
*/
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude (lat) and longitude (lng) parameters are required"
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const radKm = Number(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radKm) || radKm <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lat, lng, or radius query parameters"
      });
    }

    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error fetching nearby reports:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch nearby reports"
      });
    }

    // Filter reports within radius (in kilometers)
    const nearbyReports = (data || []).filter((report) => {
      if (typeof report.latitude !== "number" || typeof report.longitude !== "number") return false;
      const dist = haversineKm(latitude, longitude, report.latitude, report.longitude);
      return dist <= radKm;
    });

    res.json({
      success: true,
      center: { latitude, longitude },
      radiusKm: radKm,
      count: nearbyReports.length,
      reports: nearbyReports
    });
  } catch (error) {
    console.error("Server Error in nearby reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  GET USER'S OWN REPORTS
  GET /api/reports/my-reports
*/
router.get("/my-reports", requireAuth, async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error fetching user reports:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user reports"
      });
    }

    res.json({
      success: true,
      count: (data || []).length,
      reports: data || []
    });
  } catch (error) {
    console.error("Server Error in my-reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  GET REPORT STATISTICS (Total, Pending, Verified, Resolved)
  GET /api/reports/stats
*/
router.get("/stats", async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .select("status");

    if (error) {
      console.error("Supabase Error fetching stats:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch report statistics"
      });
    }

    const reportsData = data || [];
    const total = reportsData.length;
    const reported = reportsData.filter(r => (r.status || "").toUpperCase() === "REPORTED").length;
    const verified = reportsData.filter(r => (r.status || "").toUpperCase() === "VERIFIED").length;
    const inProgress = reportsData.filter(r => (r.status || "").toUpperCase() === "IN_PROGRESS").length;
    const resolved = reportsData.filter(r => (r.status || "").toUpperCase() === "RESOLVED").length;

    res.json({
      success: true,
      stats: {
        total,
        active: reported + verified + inProgress,
        reported,
        verified,
        inProgress,
        resolved
      }
    });
  } catch (error) {
    console.error("Server Error in reports stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  CREATE A NEW ROAD HAZARD REPORT
  POST /api/reports
  - Category / Hazard type is the ONLY strictly required field.
  - Photo, Description, Severity, Traffic Impact, and Coordinates are all optional.
  - Submission is never blocked if GPS or photo is missing.
  - Automatically identifies authenticated reporter from token.
  - Triggers authority email notification.
*/
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      hazard_type,
      category,
      description,
      latitude,
      longitude,
      severity,
      traffic_affected,
      trafficImpact,
      photo_url,
      imageUrl,
      address,
      created_at
    } = req.body;

    const finalType = hazard_type || category;
    const finalSeverity = (severity || "medium").toLowerCase();
    const finalPhoto = photo_url || imageUrl || null;
    const finalTraffic =
      traffic_affected !== undefined ? Boolean(traffic_affected) : trafficImpact === "yes";

    // ONLY Category / Hazard Type is strictly required
    if (!finalType || String(finalType).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Issue category / hazard type is required"
      });
    }

    // Coordinates: optional. If omitted or invalid, use default city center coordinates
    let numLat = 12.9716;
    let numLng = 77.5946;
    let hasExactCoordinates = false;

    if (
      latitude !== undefined &&
      latitude !== null &&
      !isNaN(Number(latitude)) &&
      longitude !== undefined &&
      longitude !== null &&
      !isNaN(Number(longitude))
    ) {
      numLat = Number(latitude);
      numLng = Number(longitude);
      hasExactCoordinates = true;
    }

    const finalAddress =
      address && address.trim()
        ? address.trim()
        : hasExactCoordinates
        ? `${numLat.toFixed(4)}° N, ${numLng.toFixed(4)}° E`
        : "Location not specified — General Area";

    if (!checkSupabaseConfigured(res)) return;

    const userId = req.user ? req.user.id : null;
    const tableName = await getReportsTable();

    // Fetch reporter profile if authenticated
    let reporterProfile = null;
    if (userId) {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, name, full_name, email, avatar_url")
          .eq("id", userId)
          .single();
        reporterProfile = p || {
          id: userId,
          email: req.user.email,
          name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email?.split("@")[0]
        };
      } catch (_) {}
    }

    const reportPayload = {
      user_id: userId,
      hazard_type: finalType,
      category: finalType,
      description: description && description.trim() ? description.trim() : null,
      latitude: numLat,
      longitude: numLng,
      address: finalAddress,
      severity: finalSeverity,
      traffic_affected: finalTraffic,
      photo_url: finalPhoto,
      status: "REPORTED",
      created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString()
    };

    // Attempt insert with complete payload
    let { data, error } = await supabase
      .from(tableName)
      .insert([reportPayload])
      .select()
      .single();

    // If schema mismatch occurs (e.g. 'category' or 'address' column does not exist in older table)
    if (error && error.code === "42703") {
      console.warn("Retrying insert with minimal standard columns due to schema difference:", error.message);
      const minimalPayload = {
        user_id: userId,
        hazard_type: finalType,
        description: description || null,
        latitude: numLat,
        longitude: numLng,
        severity: finalSeverity,
        traffic_affected: finalTraffic,
        photo_url: finalPhoto,
        status: "REPORTED"
      };

      const retryRes = await supabase
        .from(tableName)
        .insert([minimalPayload])
        .select()
        .single();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error("Supabase Error creating report:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to create report: ${error.message}`
      });
    }

    // Trigger authority email notification
    let emailResult = null;
    try {
      emailResult = await sendAuthorityReportNotification(data || reportPayload, reporterProfile);
    } catch (emailErr) {
      console.error("Email notification error:", emailErr);
      emailResult = { sent: false, error: emailErr.message };
    }

    res.status(201).json({
      success: true,
      message: "Road hazard reported successfully",
      report: data,
      emailNotification: emailResult
    });

  } catch (error) {
    console.error("Server Error in create report:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  GET ALL ROAD HAZARD REPORTS (Newest First)
  GET /api/reports
*/
router.get("/", async (req, res) => {
  try {
    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error fetching reports:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch reports"
      });
    }

    res.json({
      success: true,
      count: (data || []).length,
      reports: data || []
    });

  } catch (error) {
    console.error("Server Error in get all reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  GET ONE REPORT BY ID
  GET /api/reports/:id
  - Attaches reporter details.
  - Preserves privacy: full email is restricted to administrators and report owner.
*/
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    // Determine caller authorization for privacy check
    let isAuthorizedViewer = false;
    if (req.user) {
      if (data.user_id && req.user.id === data.user_id) {
        isAuthorizedViewer = true;
      } else {
        const { data: callerProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", req.user.id)
          .single();
        if (callerProfile?.role === "admin" || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === req.user.email.toLowerCase())) {
          isAuthorizedViewer = true;
        }
      }
    }

    // Attach reporter identity
    let reporter = { name: "Community Member" };
    if (data.user_id) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, name, full_name, email, avatar_url")
        .eq("id", data.user_id)
        .single();

      if (p) {
        if (isAuthorizedViewer) {
          reporter = {
            id: p.id,
            name: p.full_name || p.name || p.email?.split("@")[0],
            email: p.email,
            avatar_url: p.avatar_url || ""
          };
        } else {
          // Public privacy protection: mask email
          reporter = {
            id: p.id,
            name: p.full_name || p.name || "Community Member",
            avatar_url: p.avatar_url || ""
          };
        }
      }
    }

    res.json({
      success: true,
      report: {
        ...data,
        reporter
      }
    });

  } catch (error) {
    console.error("Server Error fetching report by id:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  UPDATE REPORT STATUS (ADMIN ONLY)
  PUT /api/reports/:id/status
*/
router.put("/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "REPORTED",
      "VERIFIED",
      "IN_PROGRESS",
      "RESOLVED"
    ];

    const normalizedStatus = status ? status.toUpperCase() : "";

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed statuses are: ${allowedStatuses.join(", ")}`
      });
    }

    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();
    const { data, error } = await supabase
      .from(tableName)
      .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase Error updating report status:", error);
      return res.status(404).json({
        success: false,
        message: "Failed to update report or report not found"
      });
    }

    res.json({
      success: true,
      message: "Report status updated",
      report: data
    });

  } catch (error) {
    console.error("Server Error updating report status:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/*
  DELETE REPORT BY ID (ADMIN OR OWNER)
  DELETE /api/reports/:id
*/
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!checkSupabaseConfigured(res)) return;

    const tableName = await getReportsTable();

    // Check ownership or admin status
    const { data: existingReport, error: fetchErr } = await supabase
      .from(tableName)
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existingReport) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    // Check profile for admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    const isAdmin = (profile && profile.role === "admin") || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === req.user.email.toLowerCase());
    const isOwner = existingReport.user_id === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this report"
      });
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase Error deleting report:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete report"
      });
    }

    res.json({
      success: true,
      message: "Report deleted successfully"
    });

  } catch (error) {
    console.error("Server Error deleting report:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;
