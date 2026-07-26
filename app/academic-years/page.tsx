import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AcademicYearsRedirectPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("universities")
    .select("id")
    .order("order_index")
    .limit(1)
    .maybeSingle();

  redirect(data ? `/universities/${data.id}` : "/universities");
}
