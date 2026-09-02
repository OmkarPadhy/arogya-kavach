import {
  useEffect,
  useState,
} from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  Loader2,
  Play,
  Radio,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/common/status";

import {
  authService,
} from "@/services/authService";

import {
  usePlatform,
} from "@/state/platform";


export const Route =
  createFileRoute("/")({
    head: () => ({
      meta: [
        {
          title:
            "Arogya Kavach · Intelligence for Health & Safety",
        },
        {
          name: "description",
          content:
            "Arogya Kavach connected industrial worker safety and monitoring platform.",
        },
      ],
    }),

    component: LoginPage,
  });


function LoginPage() {
  const {
    user,
    signIn,
  } = usePlatform();

  const [
    showRealLogin,
    setShowRealLogin,
  ] = useState(false);

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    pending,
    setPending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  /*
   * Redirect authenticated users.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    window.location.replace(
      "/overview",
    );
  }, [user]);


  /*
   * ==========================================================
   * DEMO MODE
   * ==========================================================
   */

  const enterDemoMode =
    () => {
      const result =
        authService.enterDemo();

      if (
        result.ok &&
        result.user
      ) {
        signIn(
          result.user,
        );

        window.location.replace(
          "/overview",
        );
      }
    };


  /*
   * ==========================================================
   * OPEN REAL LOGIN
   * ==========================================================
   */

  const openRealLogin =
    () => {
      setError(null);
      setUsername("");
      setPassword("");
      setShowPassword(false);
      setShowRealLogin(true);
    };


  /*
   * ==========================================================
   * REAL LOGIN
   * ==========================================================
   */

  const handleRealLogin =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (pending) {
        return;
      }

      if (!username.trim()) {
        setError(
          "Enter your username.",
        );
        return;
      }

      if (!password) {
        setError(
          "Enter your password.",
        );
        return;
      }

      setPending(true);
      setError(null);

      try {
        const result =
          await authService.login(
            username.trim(),
            password,
            "REAL",
          );

        if (
          !result.ok ||
          !result.user
        ) {
          setError(
            result.message ||
              "Login failed.",
          );

          setPending(false);
          return;
        }

        signIn(
          result.user,
        );

        window.location.replace(
          "/overview",
        );
      } catch (loginError) {
        console.error(
          loginError,
        );

        setError(
          "Unable to login. Please try again.",
        );

        setPending(false);
      }
    };


  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">

      {/* =====================================================
          LEFT BRAND / PRODUCT PANEL
          ===================================================== */}

      <section className="relative hidden flex-col justify-between bg-panel p-10 text-panel-foreground lg:flex">

        {/* BRAND */}

        <div>
          <img
            src="/arogya-kavach-logo.png"
            alt="Arogya Kavach"
            className="h-auto w-[260px] object-contain object-left"
          />

          <p className="mt-3 text-xs tracking-[0.18em] text-panel-muted">
            INTELLIGENCE FOR HEALTH &amp; SAFETY
          </p>
        </div>


        {/* PRODUCT DESCRIPTION */}

        <div className="max-w-lg">

          <h2 className="text-3xl font-semibold tracking-tight">
            Connected industrial worker safety &amp;
            monitoring
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-panel-muted">
            Arogya Kavach provides a connected
            monitoring layer for worker condition,
            environmental hazards, incidents,
            positioning and network status.
          </p>


          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">

            <div className="rounded-lg border border-panel-border bg-panel-elevated p-4">

              <dt className="label-caps text-panel-muted">
                WORKER NODES
              </dt>

              <dd className="mt-1">
                Vitals, gas, motion
              </dd>

            </div>


            <div className="rounded-lg border border-panel-border bg-panel-elevated p-4">

              <dt className="label-caps text-panel-muted">
                GATEWAYS
              </dt>

              <dd className="mt-1">
                Long-range wireless
              </dd>

            </div>


            <div className="rounded-lg border border-panel-border bg-panel-elevated p-4">

              <dt className="label-caps text-panel-muted">
                VIRTUAL SITE
              </dt>

              <dd className="mt-1">
                Interactive 3D view
              </dd>

            </div>


            <div className="rounded-lg border border-panel-border bg-panel-elevated p-4">

              <dt className="label-caps text-panel-muted">
                INCIDENTS
              </dt>

              <dd className="mt-1">
                Spatially linked alerts
              </dd>

            </div>

          </dl>

        </div>


        {/* VERSION */}

        <p className="text-[11px] text-panel-muted">
          Arogya Kavach · Prototype v1.0
        </p>

      </section>


      {/* =====================================================
          RIGHT LOGIN PANEL
          ===================================================== */}

      <section className="flex items-center justify-center bg-background px-6 py-12">

        <div className="w-full max-w-sm">

          {/* MAIN LOGO */}

          <div className="flex justify-center">

            <img
              src="/arogya-kavach-logo.png"
              alt="Arogya Kavach"
              className="h-auto w-[280px] object-contain"
            />

          </div>


          {/* BRAND NAME */}

          <div className="mt-5 text-center">

            <h1 className="text-2xl font-semibold tracking-tight">
              AROGYA KAVACH
            </h1>

            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Intelligence for Health &amp; Safety
            </p>

          </div>


          {/* =================================================
              TWO LOGIN OPTIONS
              ================================================= */}

          <div className="mt-10 space-y-3">

            <Button
              type="button"
              className="h-12 w-full"
              onClick={
                enterDemoMode
              }
            >

              <Play className="size-4" />

              Enter Demo Mode

            </Button>


            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={
                openRealLogin
              }
            >

              <Radio className="size-4" />

              Login to Real Prototype

            </Button>

          </div>


          {/* =================================================
              SYSTEM STATUS
              ================================================= */}

          <div className="mt-8 rounded-lg border bg-card p-4">

            <p className="label-caps text-muted-foreground">
              SYSTEM STATUS
            </p>

            <p className="mt-2 flex items-center gap-2 text-sm font-medium">

              <StatusDot tone="ok" />

              Platform Online

            </p>

            <p className="numeric mt-1 text-xs text-muted-foreground">
              Arogya Kavach Prototype v1.0
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          REAL LOGIN DIALOG
          ===================================================== */}

      {showRealLogin && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

          <div
            className="relative w-full max-w-md rounded-xl border bg-background p-7 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="real-login-title"
          >

            {/* CLOSE */}

            <button
              type="button"
              onClick={() => {
                if (!pending) {
                  setShowRealLogin(
                    false,
                  );
                  setError(null);
                }
              }}
              disabled={pending}
              className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >

              <X className="size-4" />

            </button>


            {/* LOGIN LOGO */}

            <div className="mb-5 flex justify-center">

              <img
                src="/arogya-kavach-logo.png"
                alt="Arogya Kavach"
                className="h-auto w-[190px] object-contain"
              />

            </div>


            {/* TITLE */}

            <div className="mb-7 text-center">

              <h2
                id="real-login-title"
                className="text-xl font-semibold"
              >
                Real Prototype Login
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Enter your authorized prototype
                credentials.
              </p>

            </div>


            {/* FORM */}

            <form
              onSubmit={
                handleRealLogin
              }
              className="space-y-5"
            >

              {/* USERNAME */}

              <div className="space-y-2">

                <Label htmlFor="real-username">
                  Username
                </Label>

                <Input
                  id="real-username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                  disabled={pending}
                  autoFocus
                />

              </div>


              {/* PASSWORD */}

              <div className="space-y-2">

                <Label htmlFor="real-password">
                  Password
                </Label>

                <div className="relative">

                  <Input
                    id="real-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    disabled={pending}
                    className="pr-10"
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) =>
                          !value,
                      )
                    }
                    disabled={pending}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}

                  </button>

                </div>

              </div>


              {/* ERROR */}

              {error && (

                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">

                  {error}

                </div>

              )}


              {/* LOGIN */}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={pending}
              >

                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Radio className="size-4" />
                )}

                {pending
                  ? "Authenticating..."
                  : "Login"}

              </Button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
