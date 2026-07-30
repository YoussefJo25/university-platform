import GpaCalculator from "@/components/study-tools/GpaCalculator";

export default function GpaCalculatorPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">
          حاسبة تقدير المعدل
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          أدخل موادك ودرجاتك المتوقعة واحسب معدلك التراكمي فورًا
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <GpaCalculator />
      </section>
    </div>
  );
}
