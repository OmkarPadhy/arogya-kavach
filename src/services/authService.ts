import type {
  PlatformUser,
  UserRole,
} from "@/data/types";

export type PlatformMode =
  | "DEMO"
  | "REAL";


export interface AuthSessionUser
  extends PlatformUser {
  mode: PlatformMode;
}


export interface AuthResult {
  ok: boolean;
  user?: AuthSessionUser;
  message?: string;
}


export interface AuthProvider {
  readonly id: string;

  login(
    username: string,
    password: string,
    mode?: PlatformMode,
  ): Promise<AuthResult>;

  enterDemo(): AuthResult;

  logout(): Promise<void>;

  restore(): AuthSessionUser | null;
}


/*
 * ============================================================
 * GOOGLE APPS SCRIPT WEB APP URL
 * ============================================================
 */

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyhD0U0q4eyNk58L-xybzySHA9bVnZXErRbgIS8d-x7zbB_NC7WyG0jaSdq_1q2HX9r/exec";


const SESSION_KEY =
  "arogya-kavach.session";


function persist(
  user: AuthSessionUser | null,
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (user) {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(user),
    );
  } else {
    window.localStorage.removeItem(
      SESSION_KEY,
    );
  }
}


/*
 * ============================================================
 * DEMO MODE
 * ============================================================
 */

function enterDemo(): AuthResult {
  const demoUser: AuthSessionUser = {
    username: "demo",
    displayName:
      "Demo Administrator",
    role: "ADMIN",
    status: "ACTIVE",
    lastLogin:
      new Date().toISOString(),
    mode: "DEMO",
  };

  persist(demoUser);

  return {
    ok: true,
    user: demoUser,
  };
}


/*
 * ============================================================
 * REAL LOGIN USING GOOGLE APPS SCRIPT JSONP
 * ============================================================
 */

function loginReal(
  username: string,
  password: string,
): Promise<AuthResult> {
  return new Promise(
    (resolve) => {
      if (
        !GOOGLE_APPS_SCRIPT_URL ||
        GOOGLE_APPS_SCRIPT_URL.includes(
          "PASTE_YOUR",
        )
      ) {
        resolve({
          ok: false,
          message:
            "Google Apps Script URL is not configured.",
        });

        return;
      }


      const callbackName =
        "__arogyaKavachLogin_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      const script =
        document.createElement(
          "script",
        );


      let completed = false;


      const cleanup = () => {
        completed = true;

        delete (
          window as unknown as Record<
            string,
            unknown
          >
        )[callbackName];

        script.remove();
      };


      const timeout =
        window.setTimeout(() => {
          if (completed) {
            return;
          }

          cleanup();

          resolve({
            ok: false,
            message:
              "Authentication server is unavailable.",
          });
        }, 15000);


      (
        window as unknown as Record<
          string,
          unknown
        >
      )[callbackName] = (
        result: {
          ok?: boolean;
          message?: string;
          user?: {
            username?: string;
            displayName?: string;
            role?: string;
            status?: string;
          };
        },
      ) => {
        if (completed) {
          return;
        }

        window.clearTimeout(
          timeout,
        );

        cleanup();


        if (
          !result ||
          !result.ok ||
          !result.user
        ) {
          resolve({
            ok: false,
            message:
              result?.message ||
              "Invalid username or password.",
          });

          return;
        }


        const user: AuthSessionUser = {
          username:
            result.user.username ||
            username,

          displayName:
            result.user.displayName ||
            username,

          role:
            (result.user.role ||
              "OPERATOR") as UserRole,

          status:
            result.user.status ||
            "ACTIVE",

          lastLogin:
            new Date().toISOString(),

          mode: "REAL",
        };


        persist(user);


        resolve({
          ok: true,
          user,
        });
      };


      const url =
        GOOGLE_APPS_SCRIPT_URL +
        "?action=login" +
        "&username=" +
        encodeURIComponent(
          username,
        ) +
        "&password=" +
        encodeURIComponent(
          password,
        ) +
        "&callback=" +
        encodeURIComponent(
          callbackName,
        );


      script.src = url;
      script.async = true;


      script.onerror = () => {
        if (completed) {
          return;
        }

        window.clearTimeout(
          timeout,
        );

        cleanup();

        resolve({
          ok: false,
          message:
            "Unable to connect to authentication server.",
        });
      };


      document.body.appendChild(
        script,
      );
    },
  );
}


/*
 * ============================================================
 * AUTH SERVICE
 * ============================================================
 */

export const authService:
  AuthProvider = {
  id: "ArogyaKavachAuth",


  async login(
    username,
    password,
    mode = "REAL",
  ) {
    if (mode === "DEMO") {
      return enterDemo();
    }

    return loginReal(
      username,
      password,
    );
  },


  enterDemo,


  async logout() {
    persist(null);
  },


  restore() {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }


    const raw =
      window.localStorage.getItem(
        SESSION_KEY,
      );


    if (!raw) {
      return null;
    }


    try {
      const user =
        JSON.parse(
          raw,
        ) as AuthSessionUser;


      if (
        !user.username ||
        !user.role ||
        !user.mode
      ) {
        return null;
      }


      if (
        user.mode !== "DEMO" &&
        user.mode !== "REAL"
      ) {
        return null;
      }


      return user;
    } catch {
      window.localStorage.removeItem(
        SESSION_KEY,
      );

      return null;
    }
  },
};


/*
 * ============================================================
 * ROLE PERMISSIONS
 * ============================================================
 */

export const rolePermissions:
  Record<UserRole, string[]> = {
  ADMIN: [
    "overview",
    "environment",
    "workers",
    "alerts",
    "network",
    "analytics",
    "users",
    "settings",
  ],

  SAFETY_SUPERVISOR: [
    "overview",
    "environment",
    "workers",
    "alerts",
    "network",
    "analytics",
  ],

  OPERATOR: [
    "overview",
    "environment",
    "workers",
    "alerts",
    "analytics",
  ],
};


export function can(
  role: UserRole | undefined,
  capability: string,
) {
  if (!role) {
    return false;
  }

  return rolePermissions[
    role
  ].includes(capability);
}


export const roleLabels:
  Record<UserRole, string> = {
  ADMIN: "Admin",
  SAFETY_SUPERVISOR:
    "Safety Supervisor",
  OPERATOR: "Operator",
};