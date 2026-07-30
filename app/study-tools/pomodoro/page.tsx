import PomodoroTimer from "@/components/study-tools/PomodoroTimer";

export default function PomodoroPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">
          تايمر البومودورو
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          نظّم وقت مذاكرتك بجلسات تركيز قصيرة وفواصل راحة منتظمة
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <PomodoroTimer />
      </section>
    </div>
  );
}
