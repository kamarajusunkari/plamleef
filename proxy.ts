import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Map DB roles to portal paths
const ROLE_PORTAL: Record<string, string> = {
  STUDENT: "/student/dashboard",
  TEACHER: "/teacher/dashboard",
  SCHOOL: "/school/dashboard",
  PARENT: "/parent/dashboard",
  CMS_ADMIN: "/cms/dashboard",
};

// Which path prefix belongs to which role
const PORTAL_ROLE: Record<string, string> = {
  "/student": "STUDENT",
  "/teacher": "TEACHER",
  "/school": "SCHOOL",
  "/parent": "PARENT",
  "/cms": "CMS_ADMIN",
};

const PROTECTED_PREFIXES = ["/student", "/teacher", "/parent", "/school", "/cms"];

function getPortalRole(pathname: string): string | null {
  for (const [prefix, role] of Object.entries(PORTAL_ROLE)) {
    if (pathname.startsWith(prefix)) return role;
  }
  return null;
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before any redirects
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // User is NOT logged in
  if (!user) {
    if (isProtectedRoute(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // User IS logged in — fetch their role from public.users
  let userRole: string | null = null;
  try {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = data?.role ?? null;
  } catch {
    // If we can't fetch role, just continue
  }

  const portalPath = userRole ? ROLE_PORTAL[userRole] : null;

  // Logged-in user hits /login or /register → redirect to their portal
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (portalPath) {
      const dest = request.nextUrl.clone();
      dest.pathname = portalPath;
      return NextResponse.redirect(dest);
    }
    return response;
  }

  // Logged-in user hits a protected route — check they have the right role
  if (isProtectedRoute(pathname) && userRole) {
    const requiredRole = getPortalRole(pathname);
    if (requiredRole && requiredRole !== userRole && portalPath) {
      const dest = request.nextUrl.clone();
      dest.pathname = portalPath;
      return NextResponse.redirect(dest);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
