#!/usr/bin/env node
"use strict";

const { bypass } = require("./bypass");

const TARGET_URL = process.argv[2];
if (!TARGET_URL) {
  console.error("Usage: crzcode-browser <url>");
  process.exit(1);
}

(async () => {
  console.log(`[crzcode/cli] target: ${TARGET_URL}`);

  let result;
  try {
    result = await bypass(TARGET_URL, {
      headless:    false,
      tf:          true,
      fingerprint: true,
      turnstile:   true,
      autoClose:   false,
    });
  } catch (err) {
    console.error("[crzcode/cli] fatal:", err.message);
    process.exit(1);
  }

  const { bypassed, title, cfClearance, tokens, cookies, browser } = result;

  console.log("\n" + "═".repeat(60));
  console.log(`Status   : ${bypassed ? "✅ BYPASSED" : "❌ FAILED"}`);
  console.log(`Title    : ${title}`);
  console.log(`CF Clear : ${cfClearance ? cfClearance.slice(0, 60) + "..." : "NONE"}`);
  console.log("\nTokens:");
  Object.entries(tokens).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(13)}: ${v ? v.slice(0, 55) + "..." : "null"}`)
  );
  console.log(`\nCookies (${cookies.length}):`);
  cookies.slice(0, 6).forEach((c) =>
    console.log(`  ${c.name}=${String(c.value).slice(0, 50)}`)
  );
  console.log("═".repeat(60) + "\n");

  await browser.close();
})();
