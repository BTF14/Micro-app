import type { DatabaseClient } from "./database";

export type OrganizationRole = "owner" | "admin" | "cashier" | "inventory";

export type TenantContext = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
};

type TenantContextRow = {
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolve an organization selector into trusted server-side identity context.
 *
 * This checks session validity and active organization membership only. It does
 * not authorize a business operation; callers must still enforce the approved
 * role/permission policy before reading or changing tenant data.
 */
export async function resolveTenantContext(
  client: DatabaseClient,
  sessionToken: string | undefined,
  requestedOrganizationId: string | undefined,
): Promise<TenantContext | null> {
  if (
    typeof sessionToken !== "string" ||
    sessionToken.length === 0 ||
    sessionToken.length > 128 ||
    typeof requestedOrganizationId !== "string" ||
    !UUID_PATTERN.test(requestedOrganizationId)
  ) {
    return null;
  }

  const tokenHash = await sha256Hex(sessionToken);
  const result = await client.query<TenantContextRow>(
    `SELECT
       u.id AS user_id,
       o.id AS organization_id,
       m.role
     FROM auth_sessions s
     JOIN app_users u ON u.id = s.user_id
     JOIN organization_members m ON m.user_id = u.id
     JOIN organizations o ON o.id = m.organization_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND u.is_active = true
       AND m.is_active = true
       AND o.is_active = true
       AND o.id = $2
     LIMIT 1`,
    [tokenHash, requestedOrganizationId],
  );

  const row = result.rows[0];
  if (!row) return null;

  // Fail closed if database contents ever violate the role constraint.
  if (!["owner", "admin", "cashier", "inventory"].includes(row.role)) return null;

  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    role: row.role,
  };
}
