import { Building2, Eye, Users } from "lucide-react";
import StatCard from "@/components/admin/StatCard";

export default function PublicStatsBar({
  totalViews,
  totalStudents,
  totalUniversities,
}: {
  totalViews: number;
  totalStudents: number;
  totalUniversities: number;
}) {
  const formatter = (n: number) => n.toLocaleString("ar-EG");

  return (
    <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
      <StatCard icon={Eye} label="إجمالي الزيارات" value={totalViews} formatter={formatter} />
      <StatCard icon={Users} label="الطلاب المسجلين" value={totalStudents} formatter={formatter} />
      <StatCard
        icon={Building2}
        label="الجامعات المشتركة"
        value={totalUniversities}
        formatter={formatter}
      />
    </div>
  );
}
