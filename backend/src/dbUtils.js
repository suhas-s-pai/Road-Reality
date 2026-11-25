const supabase = require("./supabase");

let resolvedReportsTable = null;

/**
 * Resolves the active table name for hazard reports ('hazard_reports' or 'reports')
 * to seamlessly support both schemas without breaking existing setups.
 */
async function getReportsTable() {
  if (resolvedReportsTable) return resolvedReportsTable;
  if (!supabase) return "hazard_reports";

  try {
    const { error: hazardErr } = await supabase.from("hazard_reports").select("id").limit(1);
    if (!hazardErr) {
      resolvedReportsTable = "hazard_reports";
      return "hazard_reports";
    }
  } catch (_) {}

  try {
    const { error: reportsErr } = await supabase.from("reports").select("id").limit(1);
    if (!reportsErr) {
      resolvedReportsTable = "reports";
      return "reports";
    }
  } catch (_) {}

  resolvedReportsTable = "hazard_reports";
  return "hazard_reports";
}

module.exports = {
  getReportsTable
};
