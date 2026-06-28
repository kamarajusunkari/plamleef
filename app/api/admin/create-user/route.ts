import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "EduBattle@2025";

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name,
      role,
      password = DEFAULT_PASSWORD,
      schoolId,
      classId,
      schoolData,
    } = body as {
      email: string;
      name: string;
      role: "TEACHER" | "STUDENT" | "SCHOOL" | "CMS_ADMIN" | "CMS_STAFF";
      password?: string;
      schoolId?: string;
      classId?: string;
      schoolData?: {
        username: string;
        board: string;
        display_name: string;
        city: string;
        state: string;
      };
    };

    // ── Validate required fields ──────────────────────────────────────────────
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "email, name, and role are required" },
        { status: 400 }
      );
    }

    if ((role === "TEACHER" || role === "STUDENT") && !schoolId) {
      return NextResponse.json(
        { error: "schoolId is required for TEACHER and STUDENT roles" },
        { status: 400 }
      );
    }

    // CMS_ADMIN / CMS_STAFF — no extra table needed, just auth + users row
    if (role === "CMS_ADMIN" || role === "CMS_STAFF") {
      const supabase = makeAdminClient();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (authError) return NextResponse.json({ error: authError.message }, { status: 422 });
      const userId = authData.user.id;
      const { error: userError } = await supabase.from("users").insert({ id: userId, email, name, role });
      if (userError) {
        await supabase.auth.admin.deleteUser(userId).catch(() => null);
        return NextResponse.json({ error: `Failed to create user profile: ${userError.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, userId, password });
    }

    if (role === "SCHOOL" && !schoolData) {
      return NextResponse.json(
        { error: "schoolData is required for SCHOOL role" },
        { status: 400 }
      );
    }

    const supabase = makeAdminClient();

    // ── Step 1: Create Supabase auth user ─────────────────────────────────────
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 422 }
      );
    }

    const userId = authData.user.id;

    // ── Step 2: Insert into public.users ──────────────────────────────────────
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      email,
      name,
      role,
    });

    if (userError) {
      // Best-effort cleanup — ignore cleanup errors
      await supabase.auth.admin.deleteUser(userId).catch(() => null);
      return NextResponse.json(
        { error: `Failed to create user profile: ${userError.message}` },
        { status: 500 }
      );
    }

    // ── Role-specific steps ───────────────────────────────────────────────────

    if (role === "TEACHER") {
      const { data: teacherRow, error: teacherError } = await supabase
        .from("teachers")
        .insert({ user_id: userId, school_id: schoolId })
        .select("id")
        .single();

      if (teacherError) {
        try { await supabase.auth.admin.deleteUser(userId); } catch { /* best-effort */ }
        try { await supabase.from("users").delete().eq("id", userId); } catch { /* best-effort */ }
        return NextResponse.json(
          { error: `Failed to create teacher record: ${teacherError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        userId,
        teacherId: teacherRow.id,
        password,
      });
    }

    if (role === "STUDENT") {
      // 2a. Create student row
      const { data: studentRow, error: studentError } = await supabase
        .from("students")
        .insert({ user_id: userId, school_id: schoolId })
        .select("id")
        .single();

      if (studentError) {
        try { await supabase.auth.admin.deleteUser(userId); } catch { /* best-effort */ }
        try { await supabase.from("users").delete().eq("id", userId); } catch { /* best-effort */ }
        return NextResponse.json(
          { error: `Failed to create student record: ${studentError.message}` },
          { status: 500 }
        );
      }

      const studentId = studentRow.id;
      let studentRecordId: string | undefined;

      // 2b. Create student_records if classId was provided
      if (classId) {
        const { data: recordRow, error: recordError } = await supabase
          .from("student_records")
          .insert({ student_id: studentId, class_id: classId, is_current: true })
          .select("id")
          .single();

        if (recordError) {
          // Non-fatal — student created, just no class assignment yet
          console.error("student_records insert failed:", recordError.message);
        } else {
          studentRecordId = recordRow.id;

          // 2c. Seed student_xp row
          const { error: xpError } = await supabase
            .from("student_xp")
            .insert({ student_records_id: studentRecordId, total_xp: 0 });

          if (xpError) {
            console.error("student_xp insert failed:", xpError.message);
          }
        }
      }

      return NextResponse.json({
        success: true,
        userId,
        studentId,
        studentRecordId,
        password,
      });
    }

    if (role === "SCHOOL") {
      const { data: schoolRow, error: schoolError } = await supabase
        .from("schools")
        .insert({
          user_id: userId,
          username: schoolData!.username,
          board: schoolData!.board,
          display_name: schoolData!.display_name,
          city: schoolData!.city,
          state: schoolData!.state,
        })
        .select("id")
        .single();

      if (schoolError) {
        try { await supabase.auth.admin.deleteUser(userId); } catch { /* best-effort */ }
        try { await supabase.from("users").delete().eq("id", userId); } catch { /* best-effort */ }
        return NextResponse.json(
          { error: `Failed to create school record: ${schoolError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        userId,
        schoolId: schoolRow.id,
        password,
      });
    }

    // Should never reach here given validation above
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[create-user] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
