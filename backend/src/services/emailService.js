const nodemailer = require("nodemailer");

/**
 * Sends an email notification to the relevant authority when a new road hazard report is submitted.
 *
 * Configurable via environment variables:
 * - AUTHORITY_EMAIL: Destination address of the responsible roads authority (e.g. authority@roadreality.gov)
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: Outgoing SMTP configuration
 * - EMAIL_FROM / SMTP_FROM: Sender identity (e.g. "Road Reality Alerts <alerts@roadreality.app>")
 * - APP_URL: Base URL of the web service for linking back to the admin dashboard
 */
async function sendAuthorityReportNotification(report, reporterInfo) {
  const authorityEmail = process.env.AUTHORITY_EMAIL || "authority@roadreality.local";
  const appUrl = (process.env.APP_URL || "http://localhost:5000").replace(/\/+$/, "");
  const adminReportUrl = `${appUrl}/hazards/${report.id}`;
  const adminDashboardUrl = `${appUrl}/admin`;

  const reportId = report.id || "N/A";
  const category = report.category || report.hazard_type || "Road Hazard";
  const address =
    report.address ||
    (report.latitude && report.longitude
      ? `${Number(report.latitude).toFixed(4)}°, ${Number(report.longitude).toFixed(4)}°`
      : "Location not specified — General area");
  const submissionTime = report.created_at
    ? new Date(report.created_at).toLocaleString()
    : new Date().toLocaleString();
  const severity = (report.severity || "medium").toUpperCase();
  const trafficImpact = report.traffic_affected
    ? "High / Traffic Blocked"
    : report.traffic_impact || "Moderate";
  const description = report.description && report.description.trim() ? report.description.trim() : "None provided";
  const photoUrl = report.photo_url || report.imageUrl || null;

  const reporterName = reporterInfo?.full_name || reporterInfo?.name || "Community Member";
  const reporterEmail = reporterInfo?.email || "Restricted / Anonymous";

  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    `"Road Reality Alerts" <notifications@roadreality.app>`;

  const isConfigured = Boolean(smtpHost && smtpUser && smtpPass);

  if (!isConfigured) {
    console.log(
      `ℹ️  [Authority Notification Notice]: SMTP is not configured in backend/.env (SMTP_HOST/SMTP_USER missing).`
    );
    console.log(
      `   New Report #${reportId} (${category}) logged for configured Authority: ${authorityEmail}.`
    );
    return {
      sent: false,
      reason: "SMTP_NOT_CONFIGURED",
      authorityEmail,
      reportId
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: fromEmail,
      to: authorityEmail,
      subject: `🚨 [Road Reality] New Hazard Report #${String(reportId).substring(0, 8)}: ${category} at ${address}`,
      text: `Road Reality - New Hazard Alert

Report ID: ${reportId}
Category: ${category}
Severity: ${severity}
Traffic Impact: ${trafficImpact}
Location: ${address}
Submission Time: ${submissionTime}
Reporter: ${reporterName} (${reporterEmail})
Description: ${description}
${photoUrl ? `Photograph: ${photoUrl}\n` : ""}

Review this report in the Road Reality Admin Dashboard:
${adminReportUrl}
${adminDashboardUrl}
`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: #e11d48; padding: 12px 18px; border-radius: 8px; color: #ffffff; font-weight: bold; font-size: 18px;">
            ⚠️ Road Reality — New Hazard Notification
          </div>
          <div style="padding: 16px 0;">
            <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
              A new road hazard report has been submitted by a citizen and requires authority review.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e293b;">
              <tr><td style="padding: 8px; font-weight: bold; width: 140px; border-bottom: 1px solid #f1f5f9;">Report ID:</td><td style="padding: 8px; font-family: monospace; border-bottom: 1px solid #f1f5f9;">${reportId}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Category:</td><td style="padding: 8px; font-weight: bold; color: #e11d48; border-bottom: 1px solid #f1f5f9;">${category}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">📍 ${address}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Submission Time:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">🕒 ${submissionTime}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Severity:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${severity}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Traffic Impact:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${trafficImpact}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Reporter:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${reporterName} (${reporterEmail})</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Description:</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${description}</td></tr>
            </table>

            ${
              photoUrl
                ? `
              <div style="margin-top: 16px;">
                <p style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #475569;">Attached Photograph:</p>
                <img src="${photoUrl}" alt="${category}" style="max-width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; max-height: 320px; object-fit: cover;" />
              </div>
            `
                : ""
            }

            <div style="margin-top: 24px; text-align: center;">
              <a href="${adminReportUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Review in Admin Dashboard →
              </a>
            </div>
          </div>
          <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; text-align: center;">
            Road Reality Real-Time Road Safety System • Sent to configured authority: ${authorityEmail}
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ [Authority Notification]: Email successfully dispatched to ${authorityEmail} (Message ID: ${info.messageId})`
    );
    return {
      sent: true,
      messageId: info.messageId,
      authorityEmail,
      reportId
    };
  } catch (err) {
    console.error(
      `❌ [Authority Notification Error]: Failed to send email to ${authorityEmail}:`,
      err.message
    );
    return {
      sent: false,
      error: err.message,
      authorityEmail,
      reportId
    };
  }
}

module.exports = {
  sendAuthorityReportNotification
};
