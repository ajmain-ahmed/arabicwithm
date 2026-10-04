/// Publishable keys confer no user authority; they are guests, not user JWTs.
export function isGuestBearer(
  bearer: string | undefined,
  anonKey: string | undefined,
): boolean {
  return !bearer || bearer === anonKey || bearer.startsWith("sb_publishable_");
}

export function guestToken(body: Record<string, unknown>): string {
  if (
    typeof body.guest_token !== "string" ||
    !/^[a-f0-9]{64}$/.test(body.guest_token)
  ) {
    throw new Error("invalid_request");
  }
  return body.guest_token;
}

export function statusIds(body: Record<string, unknown>): string[] {
  if (
    !Array.isArray(body.ids) || body.ids.length > 30 ||
    body.ids.some((id) =>
      typeof id !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        id,
      )
    )
  ) {
    throw new Error("invalid_request");
  }
  return body.ids;
}

export async function privateHash(
  value: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signed)].map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

