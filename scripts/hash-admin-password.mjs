import { createHash } from "node:crypto";

const password = process.argv.slice(2).join(" ");

if (!password) {
  console.error("Usage: npm run hash:admin -- \"your admin password\"");
  process.exit(1);
}

console.log(createHash("sha256").update(password).digest("hex"));
