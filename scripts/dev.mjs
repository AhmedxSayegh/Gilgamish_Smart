import { spawn } from "node:child_process";
const children = ["backend", "frontend"].map((workspace) =>
  spawn("npm", ["run", "dev", "--workspace", workspace], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
);
let stopped = false;
function stop(code = 0) {
  if (stopped) return;
  stopped = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("exit", (code) => stop(code || 0));
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
