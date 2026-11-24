/**
 * Validate server-side database configuration without opening a connection.
 * Never log or return the connection string: it contains credentials.
 */
export function isDatabaseUrlConfigured(value: string | undefined): boolean {
  if (!value || value.trim() !== value || value.length === 0) return false;

  try {
    const url = new URL(value);
    const supportedProtocol =
      url.protocol === "postgres:" || url.protocol === "postgresql:";

    return (
      supportedProtocol &&
      url.hostname.length > 0 &&
      url.username.length > 0 &&
      url.password.length > 0 &&
      url.hash.length === 0
    );
  } catch {
    return false;
  }
}
