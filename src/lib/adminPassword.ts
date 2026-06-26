const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH?.trim();
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD?.trim();
const sha256HashPattern = /^[a-f0-9]{64}$/i;

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminPassword(password: string) {
  if (!adminPasswordHash && !adminPassword) {
    return {
      ok: false,
      message: "Admin password is not configured for this build.",
    };
  }

  if (adminPassword && password === adminPassword) {
    return {
      ok: true,
      message: "",
    };
  }

  if (adminPasswordHash && !sha256HashPattern.test(adminPasswordHash)) {
    return {
      ok: password === adminPasswordHash,
      message:
        password === adminPasswordHash ? "" : "Admin password did not match.",
    };
  }

  const candidateHash = await sha256Hex(password);
  const normalizedHash = adminPasswordHash?.toLowerCase();

  return {
    ok: candidateHash === normalizedHash,
    message:
      candidateHash === normalizedHash
        ? ""
        : "Admin password did not match.",
  };
}
