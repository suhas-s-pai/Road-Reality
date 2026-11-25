const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

process.env.NODE_ENV = "test";
process.env.PORT = "5055";

const app = require("./src/server");
const supabase = require("./src/supabase");

async function runTests() {
  console.log("==================================================");
  console.log("  ROAD REALITY SYSTEM VERIFICATION SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`  [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? "- " + detail : ""}`);
      failed++;
    }
  }

  // 1. Supabase Connection & Admin Profile Check
  console.log("\n1. Supabase Database & Admin Profile Verification:");
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, name, role")
      .eq("email", "suhaspai13@gmail.com")
      .single();

    assert(!error && profile, "Admin profile query for suhaspai13@gmail.com", profile?.role);
    assert(profile?.role === "admin", "Admin role confirmed in Supabase", `role = ${profile?.role}`);
  } catch (err) {
    assert(false, "Supabase connection test", err.message);
  }

  // 2. Start Express Test Server
  const server = app.listen(5055, "127.0.0.1");

  const request = (method, path, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "127.0.0.1",
        port: 5055,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, text: data, json });
        });
      });

      req.on("error", reject);
      if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
      req.end();
    });
  };

  console.log("\n2. Full-Stack Single-Service Express & SPA Routing Verification:");
  try {
    // Test Health
    const health = await request("GET", "/api/health");
    assert(health.status === 200 && health.json?.status === "ok", "GET /api/health returns 200 OK");

    // Test Frontend Static / Serving
    const home = await request("GET", "/");
    assert(home.status === 200 && home.text.includes('<div id="root">'), "GET / serves React HTML root bundle");

    // Test SPA Fallback Routing
    const explore = await request("GET", "/explore");
    assert(explore.status === 200 && explore.text.includes('<div id="root">'), "GET /explore serves SPA fallback");

    const adminRoute = await request("GET", "/admin");
    assert(adminRoute.status === 200 && adminRoute.text.includes('<div id="root">'), "GET /admin serves SPA fallback");

    const myReports = await request("GET", "/my-reports");
    assert(myReports.status === 200 && myReports.text.includes('<div id="root">'), "GET /my-reports serves SPA fallback");

    const notifs = await request("GET", "/notifications");
    assert(notifs.status === 200 && notifs.text.includes('<div id="root">'), "GET /notifications serves SPA fallback");

    // Test Security & Role-Based Access Control
    console.log("\n3. API Security & Role-Based Access Control:");
    const unauthProfile = await request("GET", "/api/auth/profile");
    assert(unauthProfile.status === 401, "GET /api/auth/profile requires auth token (401)");

    const unauthAdminReports = await request("GET", "/api/admin/reports");
    assert(unauthAdminReports.status === 401, "GET /api/admin/reports requires admin auth token (401)");

    const unauthAdminStats = await request("GET", "/api/admin/stats");
    assert(unauthAdminStats.status === 401, "GET /api/admin/stats requires admin auth token (401)");

    // Test Reports API
    console.log("\n4. Hazard Reports Endpoints & Non-blocking Submission:");
    const reportsRes = await request("GET", "/api/reports");
    assert(reportsRes.status === 200, "GET /api/reports returns 200 OK", `Count: ${reportsRes.json?.count ?? reportsRes.json?.reports?.length ?? 0}`);

    const emptyReport = await request("POST", "/api/reports", {}, {});
    assert(emptyReport.status === 400, "POST /api/reports rejects submission when category is missing (400)");

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
