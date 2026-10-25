export type Bindings = {
  DATABASE_URL?: string;
  FRONTEND_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // Exact, pre-registered redirect URI (e.g. https://api.example.com/auth/google/callback).
  // Must match a URI registered in the Google OAuth client exactly; never derived from the request.
  GOOGLE_REDIRECT_URI?: string;
  // One-time administrative bootstrap secret. Compared against the value supplied
  // when starting the very first Google sign-in; the database seals further use
  // regardless of whether this secret is reused or leaked.
  BOOTSTRAP_TOKEN?: string;
};
