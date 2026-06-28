import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CmsShell from "@/components/cms/CmsShell";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (role === "STUDENT") redirect("/student/dashboard");
  if (role === "TEACHER") redirect("/teacher/dashboard");
  if (role === "SCHOOL")  redirect("/school/dashboard");
  if (role === "PARENT")  redirect("/parent/dashboard");

  // Only CMS_ADMIN and CMS_STAFF allowed past here
  if (role !== "CMS_ADMIN" && role !== "CMS_STAFF") {
    redirect("/login");
  }

  return <CmsShell userRole={role}>{children}</CmsShell>;
}
