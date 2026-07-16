export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL ?? "admin@ags-a2e.com",
    passwordConfigured: Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== "change-me")
  };
}
