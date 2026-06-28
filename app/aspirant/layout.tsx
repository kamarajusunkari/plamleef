import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AspirantShell from "@/components/aspirant/AspirantShell";

export default async function AspirantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single();

  if (profile?.role && profile.role !== "ASPIRANT") {
    const portals: Record<string, string> = {
      STUDENT: "/student/dashboard", TEACHER: "/teacher/dashboard",
      SCHOOL: "/school/dashboard",   PARENT: "/parent/dashboard",
      CMS_ADMIN: "/cms/dashboard",   CMS_STAFF: "/cms/dashboard",
    };
    redirect(portals[profile.role] ?? "/login");
  }

  return <AspirantShell>{children}</AspirantShell>;
}
