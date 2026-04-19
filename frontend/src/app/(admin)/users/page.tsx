import type { Metadata } from "next";
import UsersManagement from "@/components/users/UsersManagement";
import type { UserRow } from "@/components/users/user-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export const metadata: Metadata = {
  title: "Users | System Admin",
  description: "Users in your organization",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [usersRes, sessionRes] = await Promise.all([
    fetchBackendAuthenticated("/api/users/"),
    fetchBackendAuthenticated("/api/auth/session"),
  ]);

  if (usersRes === null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Users</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Your session does not include API credentials. Sign out and sign in again to view the
            user directory.
          </p>
        </div>
      </>
    );
  }

  if (!usersRes.ok) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Users</h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Could not load users (HTTP {usersRes.status}).
          </p>
        </div>
      </>
    );
  }

  const users = (await usersRes.json()) as UserRow[];

  let currentUserId: number | null = null;
  if (sessionRes?.ok) {
    const session = (await sessionRes.json()) as { id: number };
    currentUserId = session.id;
  }

  return <UsersManagement users={users} currentUserId={currentUserId} />;
}
