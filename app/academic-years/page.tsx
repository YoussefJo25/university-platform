import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function AcademicYearsRedirectPage() {
  const { data } = await supabase
    .from("universities")
    .select("id")
    .order("order_index")
    .limit(1)
    .maybeSingle();

  redirect(data ? `/universities/${data.id}` : "/universities");
}
