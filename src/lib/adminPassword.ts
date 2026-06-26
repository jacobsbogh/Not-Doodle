const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH?.trim().toLowerCase();

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminPassword(password: string) {
  if (!adminPasswordHash) {
    return {
      ok: false,
      message: "Admin password hash is not configured.",
    };
  }

  const candidateHash = await sha256Hex(password);

  return {
    ok: candidateHash === adminPasswordHash,
    message:
      candidateHash === adminPasswordHash
        ? ""
        : "Admin password did not match.",
  };
}
