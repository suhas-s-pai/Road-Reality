const fs = require("fs");
const path = require("path");
const supabase = require("./supabase");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "admin_store.json");

// Ensure data directory exists
function ensureDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initialData = {
        invitations: [],
        auditLogs: [],
        localAdmins: []
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
    return JSON.parse(raw);
  } catch (err) {
    return { invitations: [], auditLogs: [], localAdmins: [] };
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

  // Try writing to Supabase
  if (supabase) {
    try {
      const { error } = await supabase.from("admin_audit_logs").insert([entry]);
      if (!error) return entry;
    } catch (e) {
      // Table might not exist yet; fall through
    }
  }

  // Fallback to local store
  const store = readLocalStore();
  store.auditLogs = store.auditLogs || [];
  store.auditLogs.unshift(entry);
  if (store.auditLogs.length > 200) store.auditLogs = store.auditLogs.slice(0, 200);
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
          full_name: u.full_name || u.name || (u.email ? u.email.split("@")[0] : "Admin"),
          avatar_url: u.avatar_url || "",
          role: "admin",
          created_at: u.created_at || new Date().toISOString(),
          updated_at: u.updated_at || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn("[AdminStore] Supabase query for admins failed:", err.message);
    }
  }

  // If DB returned admins, return them
  if (dbAdmins.length > 0) {
    return dbAdmins;
  }

  // Fallback to local store or environment bootstrap admin
  const store = readLocalStore();
  if (Array.isArray(store.localAdmins) && store.localAdmins.length > 0) {
    return store.localAdmins;
  }

  // Default bootstrap admin if nothing else exists
  const bootstrapEmail = process.env.ADMIN_EMAIL || "suhaspai13@gmail.com";
  return [{
    id: "bootstrap-admin-01",
    email: bootstrapEmail,
    full_name: "Suhas S Pai",
    avatar_url: "",
    role: "admin",
    created_at: new Date().toISOString()
  }];
}

/**
 * Get pending admin invitations
 */
async function getInvitations() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      // Table might not exist yet; fall back
    }
  }

  const store = readLocalStore();
  return (store.invitations || []).filter(inv => inv.status === "pending");
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
      // Table might not exist yet; fall back
    }
  }

  const store = readLocalStore();
  return (store.auditLogs || []).slice(0, limit);
}

/**
 * Add or invite an administrator
 */
async function addOrInviteAdmin({ email, fullName, actorUser }) {
  if (!email || !email.includes("@")) {
    return { success: false, message: "A valid email address is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const actorEmail = actorUser?.email || "system";
  const actorId = actorUser?.id || null;

  // 1. Check if user is already an admin
  const currentAdmins = await listAdmins();
  const alreadyAdmin = currentAdmins.some(a => (a.email || "").toLowerCase() === normalizedEmail);
  if (alreadyAdmin) {
    return { success: false, message: `"${normalizedEmail}" is already an administrator.` };
  }

  // 2. Check if the user already exists in profiles
  let existingProfile = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, name, role")
        .ilike("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      existingProfile = data;
    } catch (err) {
      console.warn("[AdminStore] Could not check profile by email:", err.message);
    }
  }

  // Case A: User is already registered as a citizen -> Promote directly to admin
  if (existingProfile && existingProfile.id) {
    if (supabase) {
      try {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            role: "admin",
            full_name: fullName || existingProfile.full_name || existingProfile.name,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingProfile.id);

        if (updateErr) {
          console.error("[AdminStore] Error promoting user:", updateErr);
          return { success: false, message: "Failed to update user role in database." };
        }
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    // Record audit log
    await recordAuditLog({
      actorId,
      actorEmail,
      action: "PROMOTE_ADMIN",
      targetEmail: normalizedEmail,
      details: { fullName, userId: existingProfile.id }
    });

    return {
      success: true,
      promoted: true,
      message: `User ${normalizedEmail} has been promoted to Administrator.`
    };
  }

  // Case B: User has not signed in yet -> Create pending invitation
  // Check if invitation already exists
  const pendingInvites = await getInvitations();
  const duplicateInvite = pendingInvites.some(inv => (inv.email || "").toLowerCase() === normalizedEmail);
  if (duplicateInvite) {
    return { success: false, message: `An invitation is already pending for "${normalizedEmail}".` };
  }

  const newInvitation = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalizedEmail,
    full_name: fullName || normalizedEmail.split("@")[0],
    invited_by: actorId,
    invited_by_email: actorEmail,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  let dbSaved = false;
  if (supabase) {
    try {
      const { error: invErr } = await supabase
        .from("admin_invitations")
        .insert([newInvitation]);

      if (!invErr) {
        dbSaved = true;
      } else {
        console.warn("[AdminStore] DB insert for invitation warning:", invErr.message);
      }
    } catch (err) {
      // Table might not exist yet
    }
  }

  // Also save to local store as fallback/cache
  const store = readLocalStore();
  store.invitations = store.invitations || [];
  store.invitations.push(newInvitation);
  writeLocalStore(store);

  // Record audit log
  await recordAuditLog({
    actorId,
    actorEmail,
    action: "INVITE_ADMIN",
    targetEmail: normalizedEmail,
    details: { fullName, status: "pending" }
  });

  return {
    success: true,
    invited: true,
    invitation: newInvitation,
    message: `Invitation sent to ${normalizedEmail}. When they sign in with this Google account, they will automatically receive Administrator access.`
  };
}

/**
 * Remove an administrator (demotes to 'user')
 * Enforces requirement: At least 1 admin must remain.
 */
async function removeAdmin({ targetId, targetEmail, actorUser }) {
  const currentAdmins = await listAdmins();

  if (currentAdmins.length <= 1) {
    return {
      success: false,
      message: "Action blocked: Road Reality requires at least one active administrator. Please add another administrator before removing this account."
    };
  }

  // Find target admin
  let target = null;
  if (targetId) {
    target = currentAdmins.find(a => a.id === targetId);
  }
  if (!target && targetEmail) {
    target = currentAdmins.find(a => (a.email || "").toLowerCase() === targetEmail.toLowerCase());
  }

  if (!target) {
    return { success: false, message: "Target administrator not found." };
  }

  const actorEmail = actorUser?.email || "";
  const actorId = actorUser?.id || "";
  const isSelfDemotion = Boolean(
    (target.id && actorId && target.id === actorId) ||
    (target.email && actorEmail && target.email.toLowerCase() === actorEmail.toLowerCase())
  );

  // Demote target in Supabase
  if (supabase && target.id && !target.id.startsWith("bootstrap-")) {
    try {
      const { error: demoteErr } = await supabase
        .from("profiles")
        .update({ role: "user", updated_at: new Date().toISOString() })
        .eq("id", target.id);

      if (demoteErr) {
        console.error("[AdminStore] Failed to demote admin in DB:", demoteErr);
        return { success: false, message: "Failed to update administrator role in database." };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // Update local store fallback
  const store = readLocalStore();
  if (Array.isArray(store.localAdmins)) {
    store.localAdmins = store.localAdmins.filter(a => a.id !== target.id && a.email.toLowerCase() !== target.email.toLowerCase());
    writeLocalStore(store);
  }

  // Record audit log
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
    message: isSelfDemotion
      ? "You have removed your own administrator role. You have been redirected to the citizen portal."
      : `Administrator privileges removed for ${target.email}.`
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
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("id", invitationId);
    } catch (err) {
      // Ignore
    }
  }

  const store = readLocalStore();
  let cancelledInv = null;
  if (Array.isArray(store.invitations)) {
    store.invitations = store.invitations.map(inv => {
      if (inv.id === invitationId) {
        cancelledInv = inv;
        return { ...inv, status: "revoked" };
      }
      return inv;
    });
    writeLocalStore(store);
  }

  await recordAuditLog({
    actorId: actorUser?.id,
    actorEmail: actorUser?.email,
    action: "CANCEL_INVITATION",
    targetEmail: cancelledInv?.email || "unknown",
    details: { invitationId }
  });

  return { success: true, message: "Invitation cancelled." };
}

/**
 * Check and claim pending invitation upon user sign-in / profile sync.
 * Returns true if an invitation was claimed and user was promoted to admin.
 */
async function claimPendingInvitation(userEmail, userId) {
  if (!userEmail) return false;
  const normalizedEmail = userEmail.trim().toLowerCase();

  let claimed = false;

  // 1. Check in Supabase admin_invitations
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
        // Upgrade profile to admin
        await supabase
          .from("profiles")
          .update({ role: "admin", updated_at: new Date().toISOString() })
          .eq("id", userId);

        // Mark invitation accepted
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

  // 2. Check in local store
  const store = readLocalStore();
  if (Array.isArray(store.invitations)) {
    const invIndex = store.invitations.findIndex(
      inv => (inv.email || "").toLowerCase() === normalizedEmail && inv.status === "pending"
    );
    if (invIndex !== -1) {
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
      details: { userId, note: "User logged in with invited email and claimed Admin role." }
    });
  }

  return claimed;
}

module.exports = {
  listAdmins,
  getInvitations,
  getAuditLogs,
  addOrInviteAdmin,
  removeAdmin,
  cancelInvitation,
  claimPendingInvitation,
  recordAuditLog
};
