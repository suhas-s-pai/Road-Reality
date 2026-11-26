import { supabase, isSupabaseConfigured } from '../lib/supabase';

const base = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Normalizes backend DB reports to match frontend component prop names.
 */
export function normalizeReport(r) {
  if (!r) return null;
  const lat = Number(r.latitude || 12.9716);
  const lng = Number(r.longitude || 77.5946);

  let formattedStatus = 'reported';
  if (r.status) {
    const s = r.status.toLowerCase();
    if (s === 'verified') formattedStatus = 'verified';
    else if (s === 'in_progress' || s === 'in progress') formattedStatus = 'in_progress';
    else if (s === 'resolved') formattedStatus = 'resolved';
    else formattedStatus = 'reported';
  }

  let verificationText = 'Reported';
  if (r.status === 'VERIFIED' || r.status === 'verified') verificationText = 'Verified';
  else if (r.status === 'IN_PROGRESS' || r.status === 'in_progress') verificationText = 'In progress';
  else if (r.status === 'RESOLVED' || r.status === 'resolved') verificationText = 'Resolved';

  return {
    id: r.id || `RR-${Math.floor(1000 + Math.random() * 8999)}`,
    user_id: r.user_id || null,
    assigned_to: r.assigned_to || '',
    category: r.hazard_type || r.category || 'Other',
    hazard_type: r.hazard_type || r.category || 'Other',
    imageUrl: r.photo_url || r.imageUrl || '',
    photo_url: r.photo_url || r.imageUrl || '',
    latitude: lat,
    longitude: lng,
    address: r.address || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
    severity: (r.severity || 'medium').toLowerCase(),
    trafficImpact: typeof r.traffic_affected === 'boolean'
      ? (r.traffic_affected ? 'yes' : 'no')
      : (r.trafficImpact || 'no'),
    traffic_affected: typeof r.traffic_affected === 'boolean'
      ? r.traffic_affected
      : r.trafficImpact === 'yes',
    description: r.description || '',
    status: formattedStatus,
    rawStatus: r.status || 'REPORTED',
    verificationStatus: verificationText,
    reportedAt: r.created_at || r.reportedAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
    admin_notes: r.admin_notes || r.notes || '',
    reporter: r.reporter || { name: 'Community Member' }
  };
}

/**
 * Fetch all road hazards from backend API or Supabase directly
 */
export async function getHazards() {
  try {
    const res = await fetch(`${base}/reports`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.reports)) {
        return { data: json.reports.map(normalizeReport) };
      }
      if (json.data && Array.isArray(json.data)) {
        return { data: json.data.map(normalizeReport) };
      }
    }
  } catch (err) {
    console.warn('API fetch hazards fallback to direct Supabase:', err.message);
  }

  // Fallback to direct Supabase query if backend API is unavailable
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { data: data.map(normalizeReport) };
      }

      // Try hazard_reports table alias
      const { data: data2, error: error2 } = await supabase
        .from('hazard_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error2 && data2) {
        return { data: data2.map(normalizeReport) };
      }
    } catch (_) {}
  }

  return { data: [] };
}

/**
 * Fetch nearby hazards based on latitude and longitude
 */
export async function getNearbyHazards(lat, lng, radius = 25) {
  try {
    const res = await fetch(`${base}/reports/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.reports)) {
        return { data: json.reports.map(normalizeReport) };
      }
    }
  } catch (err) {
    console.warn('Nearby hazards API fallback to all hazards:', err.message);
  }

  // Fallback to all hazards
  return getHazards();
}

/**
 * Fetch a single hazard by ID
 */
export async function getHazardById(id, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${base}/reports/${id}`, { headers });
    if (res.ok) {
      const json = await res.json();
      return { data: normalizeReport(json.report) };
    }
  } catch (err) {
    console.warn('Backend hazard details fallback to direct Supabase:', err.message);
  }

  // Fallback to direct Supabase query
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return { data: normalizeReport(data) };
      }

      const { data: data2, error: error2 } = await supabase
        .from('hazard_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (!error2 && data2) {
        return { data: normalizeReport(data2) };
      }
    } catch (_) {}
  }

  throw new Error('Could not load hazard details');
}

/**
 * Fetch reports created by current authenticated user
 */
export async function getMyReports(token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${base}/reports/my-reports`, { headers });
    if (res.ok) {
      const json = await res.json();
      return { data: (json.reports || []).map(normalizeReport) };
    }
  } catch (err) {
    console.warn('getMyReports API fallback to direct Supabase:', err.message);
  }

  // Fallback to direct Supabase query if session exists
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return { data: data.map(normalizeReport) };
        }
      }
    } catch (_) {}
  }

  return { data: [] };
}

/**
 * Create a new hazard report
 */
export async function createHazard(payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let reportedAtTimestamp = null;
  if (payload.date && payload.time) {
    try {
      reportedAtTimestamp = new Date(`${payload.date}T${payload.time}`).toISOString();
    } catch (_) {}
  }

  const hasCoordinates =
    payload.latitude !== undefined &&
    payload.latitude !== null &&
    !isNaN(Number(payload.latitude)) &&
    payload.longitude !== undefined &&
    payload.longitude !== null &&
    !isNaN(Number(payload.longitude));

  const rawTraffic = String(payload.trafficImpact || 'moderate').toLowerCase();
  const trafficImpactMap = {
    none: 'low',
    low: 'low',
    moderate: 'moderate',
    heavy: 'blocked',
    high: 'high',
    blocked: 'blocked',
    yes: 'moderate',
    no: 'low'
  };
  const dbTrafficImpact = trafficImpactMap[rawTraffic] || 'moderate';
  const isTrafficAffected =
    payload.traffic_affected !== undefined
      ? Boolean(payload.traffic_affected)
      : rawTraffic !== 'none' && rawTraffic !== 'no' && rawTraffic !== 'low';

  const reportBody = {
    hazard_type: payload.category || payload.hazard_type,
    category: payload.category || payload.hazard_type,
    description: payload.description ? payload.description.trim() : '',
    latitude: hasCoordinates ? Number(payload.latitude) : null,
    longitude: hasCoordinates ? Number(payload.longitude) : null,
    severity: (payload.severity || 'medium').toLowerCase(),
    traffic_impact: dbTrafficImpact,
    traffic_affected: isTrafficAffected,
    photo_url: payload.imageUrl || payload.photo_url || null,
    address: payload.address || null,
    created_at: reportedAtTimestamp || new Date().toISOString()
  };

  try {
    const res = await fetch(`${base}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportBody)
    });

    if (res.ok) {
      const json = await res.json();
      return {
        data: normalizeReport(json.report),
        emailNotification: json.emailNotification || null
      };
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Could not submit report via API.');
  } catch (err) {
    console.warn('Backend create report fallback to direct Supabase:', err.message);

    // Direct Supabase fallback
    if (supabase && isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      const directInsertData = {
        ...reportBody,
        user_id: user ? user.id : null,
        status: 'REPORTED'
      };

      const { data, error } = await supabase
        .from('reports')
        .insert([directInsertData])
        .select()
        .single();

      if (!error && data) {
        return { data: normalizeReport(data) };
      }

      // Try hazard_reports table alias
      const { data: data2, error: error2 } = await supabase
        .from('hazard_reports')
        .insert([directInsertData])
        .select()
        .single();

      if (!error2 && data2) {
        return { data: normalizeReport(data2) };
      }

      throw new Error(error?.message || error2?.message || err.message);
    }

    throw err;
  }
}

/**
 * Fetch all reports with complete reporter identities (Admin Portal)
 */
export async function getAdminReports(token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/reports`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to fetch admin reports');
  }

  const json = await res.json();
  return (json.reports || []).map(normalizeReport);
}

/**
 * Update report status (Admin authorization required)
 */
export async function updateHazardStatus(id, status, token) {
  if (!token) {
    throw new Error('Authentication required for updating report status');
  }

  const res = await fetch(`${base}/reports/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update hazard status');
  }

  const json = await res.json();
  return { data: normalizeReport(json.report) };
}

/**
 * Update report status and/or authority assignment (Admin only)
 */
export async function updateAdminReport(id, { status, assigned_to, admin_notes }, token) {
  if (!token) {
    throw new Error('Authentication required for updating report');
  }

  const payload = {};
  if (status) payload.status = status;
  if (assigned_to !== undefined) payload.assigned_to = assigned_to;
  if (admin_notes !== undefined) payload.admin_notes = admin_notes;

  const res = await fetch(`${base}/admin/reports/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update report via admin API');
  }

  const json = await res.json();
  return { data: normalizeReport(json.report) };
}

/**
 * Delete a report (Admin or owner authorization required)
 */
export async function deleteHazard(id, token) {
  if (!token) {
    throw new Error('Authentication required for deleting report');
  }

  const res = await fetch(`${base}/reports/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete report');
  }

  return res.json();
}

/**
 * Fetch report statistics (Admin Portal)
 */
export async function getAdminStats(token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${base}/admin/stats`, { headers });
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    const json = await res.json();
    return json.stats;
  } catch (_) {
    return { totalUsers: 0, totalReports: 0, activeReports: 0, resolvedReports: 0, awaitingVerification: 0 };
  }
}

/**
 * Fetch list of all registered users (Admin Portal)
 */
export async function getAdminUsers(token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to fetch registered users');
  }

  const json = await res.json();
  return json.users || [];
}

/**
 * Promote or demote user role (Admin Portal)
 */
export async function updateUserRole(userId, role, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update user role');
  }

  return res.json();
}

/**
 * Fetch full Admin Management dataset: active admins, invitations, and audit logs
 */
export async function getAdminManagementData(token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to fetch admin management data');
  }

  return res.json();
}

/**
 * Add or invite an administrator by email and name
 */
export async function addAdminAccount(email, fullName, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ email, fullName })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to add administrator');
  }

  return json;
}

/**
 * Remove an administrator
 */
export async function removeAdminAccount({ id, email }, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id, email })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to remove administrator');
  }

  return json;
}

/**
 * Cancel a pending administrator invitation
 */
export async function cancelAdminInvitation(invitationId, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to cancel invitation');
  }

  return json;
}

/**
 * Initiate a Two-Person Removal Request (Admin A requests removal of Admin B)
 */
export async function requestAdminRemoval({ targetId, targetEmail, reason }, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/remove-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ targetId, targetEmail, reason })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to create removal request');
  }

  return json;
}

/**
 * Target administrator responds to removal request (Approve or Decline)
 */
export async function respondToRemovalRequest(requestId, action, decisionNote, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/remove-request/${requestId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, decisionNote })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to process removal response');
  }

  return json;
}

/**
 * Cancel a pending removal request
 */
export async function cancelRemovalRequest(requestId, token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/management/remove-request/${requestId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to cancel removal request');
  }

  return json;
}

/**
 * Fetch administrator in-app notifications
 */
export async function getAdminNotifications(token) {
  if (!token) throw new Error('Admin authentication token required');

  const res = await fetch(`${base}/admin/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to fetch admin notifications');
  }

  return res.json();
}
