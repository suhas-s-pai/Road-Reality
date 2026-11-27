const fs = require("fs");
const path = require("path");
const supabase = require("./supabase");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "admin_store.json");

// Ensure data directory and structure exist
function ensureDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initialData = {
        invitations: [],
        auditLogs: [],
        localAdmins: [],
        removalRequests: []
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initialData, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("[AdminStore] Could not initialize local store file:", err.message);
  }
}

function readLocalStore() {
  ensureDataStore();
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    parsed.invitations = parsed.invitations || [];
    parsed.auditLogs = parsed.auditLogs || [];
    parsed.localAdmins = parsed.localAdmins || [];
    parsed.removalRequests = parsed.removalRequests || [];
    return parsed;
  } catch (err) {
    return { invitations: [], auditLogs: [], localAdmins: [], removalRequests: [] };
  }
}

function writeLocalStore(data) {
  ensureDataStore();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("[AdminStore] Error writing local store file:", err.message);
  }
}

/**
 * Record an audit log entry (in Supabase with fallback to local store)
 */
async function recordAuditLog({ actorId, actorEmail, action, targetEmail, details = {} }) {
  const timestamp = new Date().toISOString();
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    actor_id: actorId || null,
    actor_email: actorEmail || "system",
    action,
    target_email: targetEmail || null,
    details,
    created_at: timestamp
  };

  if (supabase) {
    try {
      const { error } = await supabase.from("admin_audit_logs").insert([entry]);
      if (!error) return entry;
    } catch (e) {
      // Table might not exist yet; fall through
    }
  }

  const store = readLocalStore();
  store.auditLogs = store.auditLogs || [];
  store.auditLogs.unshift(entry);
  if (store.auditLogs.length > 300) store.auditLogs = store.auditLogs.slice(0, 300);
  writeLocalStore(store);
  return entry;
}

/**
 * List all active administrators from Supabase profiles
 */
async function listAdmins() {
  let dbAdmins = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, name, avatar_url, role, created_at, updated_at")
        .eq("role", "admin")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        dbAdmins = data.map(u => ({
          id: u.id,
          email: u.email || "",
          full_name: u.full_name || u.name || (u.email ? u.email.split("@")[0] : "Administrator"),
          name: u.full_name || u.name || (u.email ? u.email.split("@")[0] : "Administrator"),
          avatar_url: u.avatar_url || "",
          role: "admin",
          created_at: u.created_at || new Date().toISOString(),
          updated_at: u.updated_at || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn("[AdminStore] Supabase query for admins notice:", err.message);
    }
  }

  if (dbAdmins.length > 0) {
    return dbAdmins;
  }

  const store = readLocalStore();
  if (Array.isArray(store.localAdmins) && store.localAdmins.length > 0) {
    return store.localAdmins;
  }

  const bootstrapEmail = process.env.ADMIN_EMAIL || "user?.email";
  return [{
    id: "bootstrap-admin-01",
    email: bootstrapEmail,
    full_name: "Suhas S Pai",
    name: "Suhas S Pai",
    avatar_url: "",
    role: "admin",
    created_at: new Date().toISOString()
  }];
}

/**
 * Get all invitations (Pending, Accepted, Expired, Cancelled)
 */
async function getAllInvitations() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      // Table might not exist yet; fall back
    }
  }

  const store = readLocalStore();
  return store.invitations || [];
}

/**
 * Get pending admin invitations
 */
async function getInvitations() {
  const all = await getAllInvitations();
  return all.filter(inv => inv.status === "pending");
}

/**
 * Get recent audit logs
 */
async function getAuditLogs(limit = 50) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      // Table might not exist yet
    }
  }

  const store = readLocalStore();
  return (store.auditLogs || []).slice(0, limit);
}

/**
 * Add or invite an administrator
 * Creates a pending invitation. Privileges are NOT active until the person
 * completes Google OAuth sign-in with that verified Gmail account.
 */
async function addOrInviteAdmin({ email, fullName, actorUser }) {
  if (!email || !email.includes("@")) {
    return { success: false, message: "A valid Gmail address is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const actorEmail = actorUser?.email || "system";
  const actorId = actorUser?.id || null;

  // Validate email format and encourage standard Gmail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, message: "Please enter a valid email format." };
  }

  // 1. Check if user is already an active admin
  const currentAdmins = await listAdmins();
  const alreadyAdmin = currentAdmins.some(a => (a.email || "").toLowerCase() === normalizedEmail);
  if (alreadyAdmin) {
    return { success: false, message: `"${normalizedEmail}" is already an active administrator.` };
  }

  // 2. Prevent duplicate pending invitations
  const allInvites = await getAllInvitations();
  const duplicatePending = allInvites.some(
    inv => (inv.email || "").toLowerCase() === normalizedEmail && inv.status === "pending"
  );
  if (duplicatePending) {
    return { success: false, message: `An invitation is already pending for "${normalizedEmail}".` };
  }

  const designatedName = fullName && fullName.trim() ? fullName.trim() : normalizedEmail.split("@")[0];

  const newInvitation = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalizedEmail,
    full_name: designatedName,
    invited_by: actorId,
    invited_by_email: actorEmail,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Try saving to Supabase
  if (supabase) {
    try {
      await supabase.from("admin_invitations").insert([newInvitation]);
    } catch (err) {
      console.warn("[AdminStore] DB insert for invitation notice:", err.message);
    }
  }

  // Update local fallback store
  const store = readLocalStore();
  store.invitations = store.invitations || [];
  store.invitations.unshift(newInvitation);
  writeLocalStore(store);

  // Record audit log
  await recordAuditLog({
    actorId,
    actorEmail,
    action: "INVITE_ADMIN",
    targetEmail: normalizedEmail,
    details: { fullName: designatedName, status: "pending" }
  });

  return {
    success: true,
    invited: true,
    invitation: newInvitation,
    message: `Invitation sent to ${normalizedEmail}. When they sign in with this verified Google account, administrative access will be activated.`
  };
}

/**
 * Cancel a pending invitation
 */
async function cancelInvitation({ invitationId, actorUser }) {
  if (!invitationId) {
    return { success: false, message: "Invitation ID is required." };
  }

  if (supabase) {
    try {
      await supabase
        .from("admin_invitations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", invitationId);
    } catch (err) {
      // Ignore
    }
  }

  const store = readLocalStore();
  let targetEmail = "unknown";
  if (Array.isArray(store.invitations)) {
    store.invitations = store.invitations.map(inv => {
      if (inv.id === invitationId) {
        targetEmail = inv.email;
        return { ...inv, status: "cancelled", updated_at: new Date().toISOString() };
      }
      return inv;
    });
    writeLocalStore(store);
  }

  await recordAuditLog({
    actorId: actorUser?.id,
    actorEmail: actorUser?.email,
    action: "CANCEL_INVITATION",
    targetEmail,
    details: { invitationId }
  });

  return { success: true, message: "Admin invitation cancelled." };
}

/**
 * Check and claim pending invitation upon user sign-in / profile sync.
 * Applies designated admin name entered by inviting admin, updates profile role to 'admin',
 * and marks invitation as 'accepted'.
 */
async function claimPendingInvitation(userEmail, userId) {
  if (!userEmail) return false;
  const normalizedEmail = userEmail.trim().toLowerCase();

  let claimed = false;
  let designatedName = "Administrator";

  if (supabase) {
    try {
      const { data: inv, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .ilike("email", normalizedEmail)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (!error && inv) {
        designatedName = inv.full_name || "Administrator";

        await supabase
          .from("profiles")
          .update({
            role: "admin",
            name: designatedName,
            full_name: designatedName,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);

        await supabase
          .from("admin_invitations")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", inv.id);

        claimed = true;
      }
    } catch (err) {
      // Table might not exist yet
    }
  }

  const store = readLocalStore();
  if (Array.isArray(store.invitations)) {
    const invIndex = store.invitations.findIndex(
      inv => (inv.email || "").toLowerCase() === normalizedEmail && inv.status === "pending"
    );
    if (invIndex !== -1) {
      designatedName = store.invitations[invIndex].full_name || designatedName;
      store.invitations[invIndex].status = "accepted";
      store.invitations[invIndex].accepted_at = new Date().toISOString();
      writeLocalStore(store);
      claimed = true;
    }
  }

  if (claimed) {
    await recordAuditLog({
      actorId: userId,
      actorEmail: normalizedEmail,
      action: "CLAIM_INVITATION",
      targetEmail: normalizedEmail,
      details: { userId, designatedName, note: "User signed in with verified Google account and claimed Admin role." }
    });
  }

  return claimed;
}

/*
  ==============================================================================
  TWO-PERSON REMOVAL APPROVAL WORKFLOW
  ==============================================================================
*/

/**
 * List all removal requests
 */
async function listRemovalRequests() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("admin_removal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      // Table might not exist yet
    }
  }

  const store = readLocalStore();
  return store.removalRequests || [];
}

/**
 * Create a pending removal request (Admin A requests removal of Admin B)
 * Does NOT immediately remove target administrator.
 */
async function createRemovalRequest({ targetId, targetEmail, reason, actorUser }) {
  const currentAdmins = await listAdmins();

  // 1. Guard: Never allow removal of the last active administrator
  if (currentAdmins.length <= 1) {
    return {
      success: false,
      message: "Action blocked: Road Reality requires at least one active administrator. You cannot request removal of the only remaining administrator."
    };
  }

  // 2. Identify target admin
  let target = null;
  if (targetId) {
    target = currentAdmins.find(a => a.id === targetId);
  }
  if (!target && targetEmail) {
    target = currentAdmins.find(a => (a.email || "").toLowerCase() === targetEmail.toLowerCase().trim());
  }

  if (!target) {
    return { success: false, message: "Target administrator not found in active administrators roster." };
  }

  const actorEmail = (actorUser?.email || "").toLowerCase().trim();
  const actorId = actorUser?.id || "";

  // 3. Guard: Cannot request removal of oneself via this workflow
  const isSelf = Boolean(
    (target.id && actorId && target.id === actorId) ||
    (target.email && actorEmail && target.email.toLowerCase() === actorEmail)
  );

  if (isSelf) {
    return {
      success: false,
      message: "You cannot initiate a removal request against yourself. Another active administrator must initiate the removal request."
    };
  }

  // 4. Guard: Prevent duplicate pending removal requests for the same target
  const existingRequests = await listRemovalRequests();
  const duplicatePending = existingRequests.some(
    r => (r.target_email || "").toLowerCase() === target.email.toLowerCase() && r.status === "awaiting_approval"
  );

  if (duplicatePending) {
    return {
      success: false,
      message: `A removal request is already awaiting approval for ${target.email}.`
    };
  }

  const requesterName = actorUser?.user_metadata?.full_name || actorUser?.name || actorEmail.split("@")[0];

  const newRemovalReq = {
    id: `rmv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    requester_id: actorId,
    requester_email: actorEmail,
    requester_name: requesterName,
    target_id: target.id,
    target_email: target.email,
    target_name: target.full_name || target.email,
    reason: reason ? reason.trim() : null,
    status: "awaiting_approval",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Try saving to Supabase
  if (supabase) {
    try {
      await supabase.from("admin_removal_requests").insert([newRemovalReq]);
    } catch (err) {
      console.warn("[AdminStore] DB insert for removal request notice:", err.message);
    }
  }

  // Update local fallback store
  const store = readLocalStore();
  store.removalRequests = store.removalRequests || [];
  store.removalRequests.unshift(newRemovalReq);
  writeLocalStore(store);

  // Record audit log
  await recordAuditLog({
    actorId,
    actorEmail,
    action: "REQUEST_ADMIN_REMOVAL",
    targetEmail: target.email,
    details: { reason: reason || null, requestId: newRemovalReq.id }
  });

  return {
    success: true,
    message: `Removal request created for ${target.email}. An in-app notification has been sent awaiting their approval.`,
    request: newRemovalReq
  };
}

/**
 * Target administrator responds to their removal request (Approve or Decline)
 * ONLY the target administrator can approve or decline their own removal request.
 */
async function respondToRemoveRequest({ requestId, action, decisionNote, actorUser }) {
  if (!["approve", "decline"].includes(action)) {
    return { success: false, message: "Invalid action. Must be 'approve' or 'decline'." };
  }

  const allRequests = await listRemovalRequests();
  const removalReq = allRequests.find(r => r.id === requestId);

  if (!removalReq) {
    return { success: false, message: "Removal request not found." };
  }

  if (removalReq.status !== "awaiting_approval") {
    return { success: false, message: `This removal request is already ${removalReq.status}.` };
  }

  const actorEmail = (actorUser?.email || "").toLowerCase().trim();
  const actorId = actorUser?.id || "";

  // Critical Security Check: Only the target administrator can approve or decline
  const isTarget = Boolean(
    (removalReq.target_id && actorId && removalReq.target_id === actorId) ||
    (removalReq.target_email && actorEmail && removalReq.target_email.toLowerCase() === actorEmail)
  );

  if (!isTarget) {
    return {
      success: false,
      message: "Security violation: Only the target administrator can approve or decline their own removal request. The requester cannot approve on their behalf."
    };
  }

  const decisionTimestamp = new Date().toISOString();
  const newStatus = action === "approve" ? "approved" : "declined";

  // CASE 1: TARGET APPROVES REMOVAL
  if (action === "approve") {
    const currentAdmins = await listAdmins();
    if (currentAdmins.length <= 1) {
      return {
        success: false,
        message: "Action blocked: You are the last remaining active administrator. Another administrator must be added before you can approve your removal."
      };
    }

    // Demote target in Supabase profiles (and clear public display name per privacy rule)
    if (supabase && removalReq.target_id && !removalReq.target_id.startsWith("bootstrap-")) {
      try {
        await supabase
          .from("profiles")
          .update({
            role: "user",
            name: null,
            full_name: null,
            avatar_url: null,
            updated_at: decisionTimestamp
          })
          .eq("id", removalReq.target_id);
      } catch (err) {
        console.error("[AdminStore] Failed to demote admin on approved removal:", err);
      }
    }

    // Update removal request record in Supabase
    if (supabase) {
      try {
        await supabase
          .from("admin_removal_requests")
          .update({
            status: "approved",
            decision_by: actorId,
            decision_at: decisionTimestamp,
            decision_note: decisionNote || "Approved by target administrator",
            updated_at: decisionTimestamp
          })
          .eq("id", requestId);
      } catch (err) {}
    }

    // Update local store fallback
    const store = readLocalStore();
    if (Array.isArray(store.localAdmins)) {
      store.localAdmins = store.localAdmins.filter(
        a => a.id !== removalReq.target_id && a.email.toLowerCase() !== removalReq.target_email.toLowerCase()
      );
    }
    if (Array.isArray(store.removalRequests)) {
      store.removalRequests = store.removalRequests.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: "approved",
            decision_by: actorId,
            decision_at: decisionTimestamp,
            decision_note: decisionNote || "Approved by target administrator",
            updated_at: decisionTimestamp
          };
        }
        return r;
      });
    }
    writeLocalStore(store);

    await recordAuditLog({
      actorId,
      actorEmail,
      action: "APPROVE_ADMIN_REMOVAL",
      targetEmail: removalReq.target_email,
      details: { requestId, requesterEmail: removalReq.requester_email, decisionNote }
    });

    return {
      success: true,
      approved: true,
      selfDemoted: true,
      message: "You have approved your removal. Your administrator privileges have been revoked and you have been redirected to the citizen interface."
    };
  }

  // CASE 2: TARGET DECLINES REMOVAL
  // Keep admin role, mark request as declined
  if (supabase) {
    try {
      await supabase
        .from("admin_removal_requests")
        .update({
          status: "declined",
          decision_by: actorId,
          decision_at: decisionTimestamp,
          decision_note: decisionNote || "Declined by target administrator",
          updated_at: decisionTimestamp
        })
        .eq("id", requestId);
    } catch (err) {}
  }

  const store = readLocalStore();
  if (Array.isArray(store.removalRequests)) {
    store.removalRequests = store.removalRequests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: "declined",
          decision_by: actorId,
          decision_at: decisionTimestamp,
          decision_note: decisionNote || "Declined by target administrator",
          updated_at: decisionTimestamp
        };
      }
      return r;
    });
    writeLocalStore(store);
  }

  await recordAuditLog({
    actorId,
    actorEmail,
    action: "DECLINE_ADMIN_REMOVAL",
    targetEmail: removalReq.target_email,
    details: { requestId, requesterEmail: removalReq.requester_email, decisionNote }
  });

  return {
    success: true,
    approved: false,
    selfDemoted: false,
    message: "You have declined the removal request. You remain an active administrator."
  };
}

/**
 * Cancel a pending removal request (by requester or admin)
 */
async function cancelRemovalRequest({ requestId, actorUser }) {
  const allRequests = await listRemovalRequests();
  const removalReq = allRequests.find(r => r.id === requestId);

  if (!removalReq) {
    return { success: false, message: "Removal request not found." };
  }

  if (removalReq.status !== "awaiting_approval") {
    return { success: false, message: `Removal request cannot be cancelled because it is ${removalReq.status}.` };
  }

  const timestamp = new Date().toISOString();

  if (supabase) {
    try {
      await supabase
        .from("admin_removal_requests")
        .update({ status: "cancelled", updated_at: timestamp })
        .eq("id", requestId);
    } catch (err) {}
  }

  const store = readLocalStore();
  if (Array.isArray(store.removalRequests)) {
    store.removalRequests = store.removalRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: "cancelled", updated_at: timestamp };
      }
      return r;
    });
    writeLocalStore(store);
  }

  await recordAuditLog({
    actorId: actorUser?.id,
    actorEmail: actorUser?.email,
    action: "CANCEL_REMOVAL_REQUEST",
    targetEmail: removalReq.target_email,
    details: { requestId }
  });

  return { success: true, message: "Removal request cancelled." };
}

/**
 * Direct removal helper (with last-admin guard, used in automated testing/emergency admin transfer)
 */
async function removeAdmin({ targetId, targetEmail, actorUser }) {
  const currentAdmins = await listAdmins();
  if (currentAdmins.length <= 1) {
    return {
      success: false,
      message: "Action blocked: Road Reality requires at least one active administrator."
    };
  }

  let target = null;
  if (targetId) target = currentAdmins.find(a => a.id === targetId);
  if (!target && targetEmail) target = currentAdmins.find(a => (a.email || "").toLowerCase() === targetEmail.toLowerCase());

  if (!target) return { success: false, message: "Target administrator not found." };

  const actorEmail = actorUser?.email || "";
  const actorId = actorUser?.id || "";
  const isSelfDemotion = Boolean(
    (target.id && actorId && target.id === actorId) ||
    (target.email && actorEmail && target.email.toLowerCase() === actorEmail.toLowerCase())
  );

  if (supabase && target.id && !target.id.startsWith("bootstrap-")) {
    try {
      await supabase
        .from("profiles")
        .update({ role: "user", name: null, full_name: null, avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", target.id);
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  const store = readLocalStore();
  if (Array.isArray(store.localAdmins)) {
    store.localAdmins = store.localAdmins.filter(a => a.id !== target.id && a.email.toLowerCase() !== target.email.toLowerCase());
    writeLocalStore(store);
  }

  await recordAuditLog({
    actorId,
    actorEmail,
    action: isSelfDemotion ? "SELF_DEMOTION" : "REMOVE_ADMIN",
    targetEmail: target.email,
    details: { targetId: target.id, isSelfDemotion }
  });

  return {
    success: true,
    selfDemoted: isSelfDemotion,
    message: isSelfDemotion ? "You have stepped down from the administrator roster." : `Administrator ${target.email} removed.`
  };
}

module.exports = {
  listAdmins,
  getInvitations,
  getAllInvitations,
  getAuditLogs,
  addOrInviteAdmin,
  removeAdmin,
  cancelInvitation,
  claimPendingInvitation,
  listRemovalRequests,
  createRemovalRequest,
  respondToRemoveRequest,
  cancelRemovalRequest,
  recordAuditLog
};
