import { headers } from "next/headers";
import { getRequestIdentity } from "@/lib/auth/identity";

/** Recheck account status before rendering private server data. No network call. */
export async function getAdminPageIdentity() {
  return getRequestIdentity(new Request("http://localhost/admin", { headers: new Headers(await headers()) }));
}
