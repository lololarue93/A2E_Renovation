import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { safeAdminNext } from "@/lib/auth/admin-session-shared";

export const metadata: Metadata = { title: "Connexion equipe", robots: { index: false, follow: false } };
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <AdminLogin next={safeAdminNext(typeof next === "string" ? next : null)} />;
}
