import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/admin/cms-staff — list all CMS_ADMIN + CMS_STAFF users with upload stats
export async function GET() {
  try {
    // Verify caller is CMS_ADMIN
    const serverSupabase = await createServerClient();
    const { data: { user: caller } } = await serverSupabase.auth.getUser();
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: callerProfile } = await serverSupabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "CMS_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role to read all CMS users
    const admin = makeAdminClient();

    const { data: staffUsers, error } = await admin
      .from("users")
      .select("id, name, email, role, created_at")
      .in("role", ["CMS_ADMIN", "CMS_STAFF"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!staffUsers || staffUsers.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    // Fetch upload counts per user (parallel)
    const staff = await Promise.all(
      staffUsers.map(async (u) => {
        const [{ count: total }, { count: pending }, { count: approved }] = await Promise.all([
          admin.from("resources").select("id", { count: "exact", head: true }).eq("created_by", u.id),
          admin.from("resources").select("id", { count: "exact", head: true }).eq("created_by", u.id).eq("visibility", "PENDING_REVIEW"),
          admin.from("resources").select("id", { count: "exact", head: true }).eq("created_by", u.id).eq("visibility", "PUBLIC"),
        ]);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
          uploadCount: total ?? 0,
          pendingCount: pending ?? 0,
          approvedCount: approved ?? 0,
        };
      })
    );

    return NextResponse.json({ staff });
  } catch (err: unknown) {
    console.error("[cms-staff] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/cms-staff?userId=xxx — remove a staff account
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Verify caller is CMS_ADMIN
    const serverSupabase = await createServerClient();
    const { data: { user: caller } } = await serverSupabase.auth.getUser();
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: callerProfile } = await serverSupabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "CMS_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't delete yourself
    if (userId === caller.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const admin = makeAdminClient();
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[cms-staff] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
