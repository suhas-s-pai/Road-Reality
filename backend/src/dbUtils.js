const supabase = require("./supabase");

let resolvedReportsTable = null;

/**
 * Resolves the active table name for hazard reports ('reports' or 'hazard_reports')
 * to seamlessly support both schemas without breaking existing setups.
 */
async function getReportsTable() {
  if (resolvedReportsTable) return resolvedReportsTable;
  if (!supabase) return "reports";

  try {
    const { error: reportsErr } = await supabase.from("reports").select("id").limit(1);
    if (!reportsErr || reportsErr.code !== "42P01") {
      resolvedReportsTable = "reports";
      return "reports";
    }
  } catch (_) {}

  try {
    const { error: hazardErr } = await supabase.from("hazard_reports").select("id").limit(1);
    if (!hazardErr || hazardErr.code !== "42P01") {
      resolvedReportsTable = "hazard_reports";
      console.log("ℹ️  [DB Notice]: Detected and using 'hazard_reports' table.");
      return "hazard_reports";
    }
  } catch (_) {}

  resolvedReportsTable = "reports";
  return "reports";
}

module.exports = {
  getReportsTable
};
