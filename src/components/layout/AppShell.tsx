import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Boxes,
  Info,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StatusDot, statusTone } from "@/components/common/status";
import { ThemeToggle } from "@/components/common/ThemeToggle";

import { roleLabels } from "@/services/authService";
import { usePlatform } from "@/state/platform";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Activity;
  emphasis?: boolean;
}

const primaryNav: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/environment", label: "Live Environment", icon: Boxes, emphasis: true },
  { to: "/workers", label: "Workers", icon: "hardhat" as never },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/network", label: "Network", icon: Radio },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { to: "/admin/users", label: "Users & Access", icon: Users },
  { to: "/admin/settings", label: "System Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

function useClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );

    tick();

    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return time;
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  fullBleed = false,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  fullBleed?: boolean | undefined;
}) {
  const platform = usePlatform();
  const navigate = useNavigate();

  const pathname = useRouterState({
    select: (state) =>
      state.location.pathname,
  });

  const time = useClock();

  useEffect(() => {
    if (
      platform.ready &&
      !platform.user
    ) {
      void navigate({
        to: "/",
      });
    }
  }, [
    platform.ready,
    platform.user,
    navigate,
  ]);

  if (!platform.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="label-caps text-muted-foreground">
          Restoring session…
        </p>
      </div>
    );
  }

  const stats = platform.stats;

  return (
    <div className="flex min-h-screen bg-background">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">

        {/* =================================================
            AROGYA KAVACH BRANDING
            ================================================= */}

        <div className="border-b px-5 py-4">

          <div className="flex items-center gap-3">

            <img
              src="/arogya-kavach-logo.png"
              alt="Arogya Kavach"
              className="h-11 w-11 shrink-0 rounded-md object-cover"
            />

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold tracking-tight">
                AROGYA KAVACH
              </p>

              <p className="text-[11px] text-muted-foreground">
                Intelligence for Health &amp; Safety
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            NAVIGATION
            ================================================= */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">

          <ul className="space-y-1">

            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={pathname.startsWith(
                  item.to,
                )}
              />
            ))}

          </ul>


          <p className="label-caps mt-6 mb-2 px-3 text-muted-foreground">
            Administration
          </p>


          <ul className="space-y-1">

            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={pathname.startsWith(
                  item.to,
                )}
              />
            ))}

          </ul>

        </nav>


        {/* =================================================
            SYSTEM / USER
            ================================================= */}

        <div className="border-t px-4 py-3">

          <div className="rounded-md bg-muted/60 px-3 py-2">

            <p className="label-caps text-muted-foreground">
              System status
            </p>

            <p className="mt-1 flex items-center gap-2 text-xs font-medium">

              <StatusDot
                tone={statusTone(
                  stats.systemStatus,
                )}
              />

              {stats.systemStatus}

            </p>

            <p className="numeric mt-1 text-[11px] text-muted-foreground">
              Last update{" "}
              {platform.snapshot?.updatedAt ??
                "—"}
            </p>

          </div>


          <div className="mt-3 flex items-center justify-between gap-2">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium">
                {platform.user.displayName}
              </p>

              <p className="truncate text-[11px] text-muted-foreground">
                {
                  roleLabels[
                    platform.user.role
                  ]
                }
              </p>

            </div>


            <button
              type="button"
              onClick={() => {
                platform.signOut();

                void navigate({
                  to: "/",
                });
              }}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
            >

              <LogOut className="size-3.5" />

              Logout

            </button>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">

        <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">

            <div className="min-w-0">

              <h1 className="truncate text-lg font-semibold tracking-tight">
                {title}
              </h1>

              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}

            </div>


            <div className="flex items-center gap-3">

              {actions}

              <ThemeToggle />


              <div className="hidden items-center gap-3 rounded-md border bg-background px-3 py-1.5 sm:flex">

                <span className="flex items-center gap-1.5 text-xs font-medium">

                  <StatusDot
                    tone={statusTone(
                      stats.systemStatus,
                    )}
                  />

                  {stats.systemStatus}

                </span>


                <span className="h-4 w-px bg-border" />


                <span className="numeric text-xs text-muted-foreground">
                  {time}
                </span>


                <span className="h-4 w-px bg-border" />


                <span className="text-xs text-muted-foreground">
                  {platform.snapshot?.site.name ??
                    "—"}
                </span>

              </div>

            </div>

          </div>


          {/* MOBILE NAVIGATION */}

          <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 lg:hidden">

            {[...primaryNav, ...adminNav].map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs whitespace-nowrap",

                    pathname.startsWith(
                      item.to,
                    )
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}

          </nav>

        </header>


        <main
          className={cn(
            "flex-1",
            fullBleed
              ? "p-0"
              : "p-5",
          )}
        >
          {children}
        </main>

      </div>

    </div>
  );
}


function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {

  const Icon = item.icon;

  /*
   * The Workers icon was previously HardHat.
   * Keep the navigation appearance without
   * using the HardHat icon for the brand.
   */
  const isWorkers =
    item.to === "/workers";

  return (
    <li>

      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",

          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",

          item.emphasis &&
            !active &&
            "text-primary",
        )}
      >

        {isWorkers ? (
          <span className="flex size-4 items-center justify-center text-sm leading-none">
            ⛑
          </span>
        ) : (
          <Icon
            className={cn(
              "size-4",
              item.emphasis &&
                "text-primary",
            )}
          />
        )}

        <span className="flex-1">
          {item.label}
        </span>


        {item.emphasis ? (
          <span className="label-caps rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            Live
          </span>
        ) : null}

      </Link>

    </li>
  );
}
