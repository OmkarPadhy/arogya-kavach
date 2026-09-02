import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, UserCog } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/status";
import { can, roleLabels, rolePermissions } from "@/services/authService";
import { dataService } from "@/services/dataService";
import type { PlatformUser } from "@/data/types";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Access · Arogya Kavach" },
      {
        name: "description",
        content:
          "Manage site accounts, roles and capability access for supervisors, operators and admins.",
      },
      { property: "og:title", content: "Users & Access · Arogya Kavach" },
      {
        property: "og:description",
        content: "Role-based access control for the connected worker safety platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const platform = usePlatform();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const allowed = can(platform.user?.role, "users");

  useEffect(() => {
    let cancelled = false;
    void dataService.getUsers().then((next) => {
      if (!cancelled) setUsers(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!allowed) {
    return (
      <AppShell title="Users & Access" subtitle="Restricted area">
        <EmptyState
          title="Administrator access required"
          description="Your role does not include user administration. Contact a site administrator."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Users & Access" subtitle="Accounts, roles and capability matrix">
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] xl:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserCog className="size-4 text-muted-foreground" /> Platform accounts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{user.displayName}</td>
                    <td className="numeric py-2.5 pr-3 text-muted-foreground">{user.username}</td>
                    <td className="py-2.5 pr-3">{roleLabels[user.role]}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={
                          user.status === "ACTIVE"
                            ? "rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ok)]"
                            : "rounded-full bg-[var(--offline-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--offline)]"
                        }
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="numeric py-2.5 text-muted-foreground">
                      {user.lastLogin ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-muted-foreground" /> Capability matrix
          </h2>
          <ul className="space-y-3 text-xs">
            {(Object.keys(rolePermissions) as (keyof typeof rolePermissions)[]).map((role) => (
              <li key={role} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{roleLabels[role]}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rolePermissions[role].map((capability) => (
                    <span
                      key={capability}
                      className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
