#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");

const port = process.env.PORT && process.env.PORT.trim() !== "" ? process.env.PORT : "3000";
process.env.PORT = port;

const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", port], {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to launch Next.js:", error);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
