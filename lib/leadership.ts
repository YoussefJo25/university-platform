export type RoleKey = "developer" | "dedication";

export type LeadershipMember = {
  id: number;
  role_key: RoleKey;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  order_index: number;
};

export const ROLE_ORDER: RoleKey[] = ["developer", "dedication"];

export const ROLE_FALLBACK_TITLE: Record<RoleKey, string> = {
  developer: "مطوّر المنصة",
  dedication: "صدقة جارية",
};

export async function getLeadershipMembers(): Promise<LeadershipMember[]> {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leadership_members`);
    url.searchParams.set("select", "id,role_key,name,title,bio,photo_url,order_index");
    url.searchParams.set("order", "order_index.asc");

    const response = await fetch(url.toString(), {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as LeadershipMember[];
  } catch (error) {
    console.warn("Failed to fetch leadership members:", error);
    return [];
  }
}
