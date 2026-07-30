"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings, SkipForward, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Phase = "focus" | "short_break" | "long_break";

type PomodoroSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  longBreakInterval: number;
  alarmVolume: number;
};

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  autoStartFocus: false,
  longBreakInterval: 4,
  alarmVolume: 100,
};

const PHASE_TABS: { key: Phase; label: string }[] = [
  { key: "focus", label: "تركيز" },
  { key: "short_break", label: "استراحة قصيرة" },
  { key: "long_break", label: "استراحة طويلة" },
];

const PHASE_STATUS_TEXT: Record<Phase, string> = {
  focus: "ركّز في مادتك من غير مقاطعة",
  short_break: "خد نفسك، وارجع بتركيز أعلى",
  long_break: "استراحة أطول — استحقيتها بعد 4 جلسات تركيز",
};

const TODAY_SESSIONS_KEY = "pomodoro_today_sessions";

function getPhaseDurationMinutes(phase: Phase, settings: PomodoroSettings): number {
  if (phase === "focus") return settings.focusMinutes;
  if (phase === "short_break") return settings.shortBreakMinutes;
  return settings.longBreakMinutes;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// عدد جلسات التركيز الحقيقية المكتملة النهاردة — متتبّع محلي (localStorage)
// لكل جهاز، مش من قاعدة البيانات، لأن السكيما المطلوبة في البرومبت بتسجّل
// دقائق البومودورو بس (pomodoro_minutes) من غير عمود لعدد الجلسات. القيمة
// دي بتتصفّر تلقائيًا أول ما التاريخ يتغيّر.
function readTodaySessionCount(): number {
  try {
    const raw = window.localStorage.getItem(TODAY_SESSIONS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed.date === todayISODate() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function bumpTodaySessionCount(): number {
  const next = readTodaySessionCount() + 1;
  window.localStorage.setItem(TODAY_SESSIONS_KEY, JSON.stringify({ date: todayISODate(), count: next }));
  return next;
}

function playAlarmSound(volumePercent: number) {
  try {
    type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const w = window as WindowWithWebkitAudio;
    const AudioContextClass = window.AudioContext ?? w.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = Math.max(0, Math.min(1, volumePercent / 100)) * 0.3;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
    oscillator.onended = () => ctx.close();
  } catch {
    // متصفحات نادرة مش داعمة Web Audio API — نتجاهل بصمت
  }
}

function showPhaseNotification(bodyText: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("بوصلة — أدوات المذاكرة", { body: bodyText, icon: "/logo.jpeg" });
  } catch {
    // تجاهل بصمت لو المتصفح رفض لأي سبب
  }
}

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [focusCountInCycle, setFocusCountInCycle] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [todayMinutes, setTodayMinutes] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);

  const endTimeRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const focusCountRef = useRef(focusCountInCycle);
  focusCountRef.current = focusCountInCycle;

  // تحميل الإعدادات المحفوظة + إحصائيات الدقائق من daily_activity
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settingsRow } = await supabase
        .from("user_pomodoro_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let loadedSettings = DEFAULT_SETTINGS;
      if (settingsRow) {
        loadedSettings = {
          focusMinutes: settingsRow.focus_minutes,
          shortBreakMinutes: settingsRow.short_break_minutes,
          longBreakMinutes: settingsRow.long_break_minutes,
          autoStartBreaks: settingsRow.auto_start_breaks,
          autoStartFocus: settingsRow.auto_start_focus,
          longBreakInterval: settingsRow.long_break_interval,
          alarmVolume: settingsRow.alarm_volume,
        };
      } else {
        await supabase.from("user_pomodoro_settings").insert({ user_id: user.id });
      }

      setSettings(loadedSettings);
      setSecondsLeft(loadedSettings.focusMinutes * 60);
      setSettingsLoaded(true);
      setTodaySessions(readTodaySessionCount());

      const { data: activityRows } = await supabase
        .from("daily_activity")
        .select("activity_date, pomodoro_minutes");

      if (activityRows) {
        const total = activityRows.reduce((sum, row) => sum + (row.pomodoro_minutes || 0), 0);
        const todayRow = activityRows.find((row) => row.activity_date === todayISODate());
        setTotalMinutes(total);
        setTodayMinutes(todayRow?.pomodoro_minutes ?? 0);
      }
    }

    load();
  }, []);

  function getNextPhase(finishedPhase: Phase, nextFocusCount: number): Phase {
    if (finishedPhase !== "focus") return "focus";
    return nextFocusCount % settingsRef.current.longBreakInterval === 0 ? "long_break" : "short_break";
  }

  async function recordFocusMinutes(minutes: number) {
    const supabase = createClient();
    await supabase.rpc("record_pomodoro_minutes", { minutes_count: minutes });
    setTodayMinutes((m) => m + minutes);
    setTotalMinutes((m) => m + minutes);
    setTodaySessions(bumpTodaySessionCount());
  }

  function switchToPhase(nextPhase: Phase, autoRun: boolean) {
    setPhase(nextPhase);
    const durationSeconds = getPhaseDurationMinutes(nextPhase, settingsRef.current) * 60;
    setSecondsLeft(durationSeconds);
    if (autoRun) {
      endTimeRef.current = Date.now() + durationSeconds * 1000;
      setIsRunning(true);
    } else {
      endTimeRef.current = null;
      setIsRunning(false);
    }
  }

  async function completeCurrentPhase(isNaturalCompletion: boolean) {
    const finishedPhase = phaseRef.current;
    endTimeRef.current = null;

    if (finishedPhase === "focus" && isNaturalCompletion) {
      await recordFocusMinutes(settingsRef.current.focusMinutes);
    }

    const nextFocusCount =
      finishedPhase === "focus" && isNaturalCompletion ? focusCountRef.current + 1 : focusCountRef.current;
    setFocusCountInCycle(nextFocusCount);

    const nextPhase = getNextPhase(finishedPhase, nextFocusCount);
    const shouldAutoStart =
      isNaturalCompletion &&
      (nextPhase === "focus" ? settingsRef.current.autoStartFocus : settingsRef.current.autoStartBreaks);

    if (isNaturalCompletion) {
      playAlarmSound(settingsRef.current.alarmVolume);
      showPhaseNotification(
        nextPhase === "focus" ? "خلصت الاستراحة — يلا نرجع نركّز" : "خلصت جلسة التركيز — وقت الاستراحة"
      );
    }

    switchToPhase(nextPhase, shouldAutoStart);
  }

  // عداد التنازل الفعلي — بيحسب الوقت المتبقي من فرق التوقيت الحقيقي (مش
  // عدّاد بيقل 1 كل نبضة) عشان النتيجة تفضل صح حتى لو المتصفح بطّأ تنفيذ
  // الـ tab وهو في الخلفية.
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      if (endTimeRef.current === null) return;
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);

      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsRunning(false);
        completeCurrentPhase(true);
      } else {
        setSecondsLeft(remaining);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  async function requestNotificationPermissionOnce() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  function handleStart() {
    requestNotificationPermissionOnce();
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
  }

  function handlePause() {
    if (endTimeRef.current !== null) {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }
    endTimeRef.current = null;
    setIsRunning(false);
  }

  function handleSkip() {
    completeCurrentPhase(false);
  }

  function handleResetPhase() {
    endTimeRef.current = null;
    setIsRunning(false);
    setSecondsLeft(getPhaseDurationMinutes(phase, settings) * 60);
  }

  function handleTabSelect(nextPhase: Phase) {
    if (nextPhase === phase) return;
    switchToPhase(nextPhase, false);
  }

  const totalPhaseSeconds = getPhaseDurationMinutes(phase, settings) * 60;
  const progressRatio = totalPhaseSeconds > 0 ? 1 - secondsLeft / totalPhaseSeconds : 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <div className="flex rounded-full border border-gold/25 bg-card p-1">
          {PHASE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabSelect(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                phase === tab.key ? "bg-gold text-gold-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetPhase}
            title="إعادة ضبط المرحلة الحالية"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-subtle text-muted transition-colors hover:border-gold hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="الإعدادات"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-subtle text-muted transition-colors hover:border-gold hover:text-ink"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center rounded-3xl border border-gold/25 bg-card px-6 py-12 shadow-sm">
        <p
          className="font-sans text-[88px] leading-none font-black tabular-nums text-ink sm:text-[130px]"
          aria-live="polite"
        >
          {settingsLoaded ? formatTime(secondsLeft) : "--:--"}
        </p>
        <p className="mt-4 text-sm text-muted sm:text-base">{PHASE_STATUS_TEXT[phase]}</p>

        <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
          />
        </div>

        <div className="mt-8 flex items-center gap-4">
          {isRunning ? (
            <button
              type="button"
              onClick={handlePause}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-gold-ink shadow-md transition-transform hover:scale-105"
              aria-label="إيقاف مؤقت"
            >
              <Pause className="h-7 w-7" aria-hidden="true" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={!settingsLoaded}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-gold-ink shadow-md transition-transform hover:scale-105 disabled:opacity-60"
              aria-label="ابدأ"
            >
              <Play className="h-7 w-7 translate-x-0.5" aria-hidden="true" fill="currentColor" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 rounded-full border border-subtle px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-gold"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            تخطي
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 divide-x divide-subtle overflow-hidden rounded-2xl border border-subtle bg-card text-center rtl:divide-x-reverse">
        <div className="px-4 py-5">
          <p className="text-2xl font-extrabold text-ink">{todaySessions}</p>
          <p className="mt-1 text-xs text-muted">جلسات اليوم</p>
        </div>
        <div className="px-4 py-5">
          <p className="text-2xl font-extrabold text-ink">{todayMinutes}</p>
          <p className="mt-1 text-xs text-muted">دقائق اليوم</p>
        </div>
        <div className="px-4 py-5">
          <p className="text-2xl font-extrabold text-gold">{totalMinutes}</p>
          <p className="mt-1 text-xs text-muted">الدقائق الإجمالية</p>
        </div>
      </div>

      {isSettingsOpen && (
        <PomodoroSettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(nextSettings) => {
            setSettings(nextSettings);
            if (!isRunning) {
              setSecondsLeft(getPhaseDurationMinutes(phase, nextSettings) * 60);
            }
          }}
        />
      )}
    </div>
  );
}

function PomodoroSettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: PomodoroSettings;
  onClose: () => void;
  onSave: (settings: PomodoroSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_pomodoro_settings").upsert(
        {
          user_id: user.id,
          focus_minutes: form.focusMinutes,
          short_break_minutes: form.shortBreakMinutes,
          long_break_minutes: form.longBreakMinutes,
          auto_start_breaks: form.autoStartBreaks,
          auto_start_focus: form.autoStartFocus,
          long_break_interval: form.longBreakInterval,
          alarm_volume: form.alarmVolume,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    setSaving(false);
    onSave(form);
    onClose();
  }

  async function handleResetAll() {
    if (!confirm("هل أنت متأكد من إعادة تعيين كل إعدادات البومودورو للقيم الافتراضية؟ الإجراء ده مينفعش يتراجع فيه.")) {
      return;
    }

    setForm(DEFAULT_SETTINGS);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_pomodoro_settings").upsert(
        {
          user_id: user.id,
          focus_minutes: DEFAULT_SETTINGS.focusMinutes,
          short_break_minutes: DEFAULT_SETTINGS.shortBreakMinutes,
          long_break_minutes: DEFAULT_SETTINGS.longBreakMinutes,
          auto_start_breaks: DEFAULT_SETTINGS.autoStartBreaks,
          auto_start_focus: DEFAULT_SETTINGS.autoStartFocus,
          long_break_interval: DEFAULT_SETTINGS.longBreakInterval,
          alarm_volume: DEFAULT_SETTINGS.alarmVolume,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    setSaving(false);
    onSave(DEFAULT_SETTINGS);
  }

  const inputClasses =
    "w-full rounded-xl border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">الإعدادات</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-ink">
            إغلاق ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">بومودورو (دقائق)</label>
            <input
              type="number"
              min={1}
              value={form.focusMinutes}
              onChange={(e) => updateField("focusMinutes", Math.max(1, Number(e.target.value)))}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">استراحة قصيرة (دقائق)</label>
            <input
              type="number"
              min={1}
              value={form.shortBreakMinutes}
              onChange={(e) => updateField("shortBreakMinutes", Math.max(1, Number(e.target.value)))}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">استراحة طويلة (دقائق)</label>
            <input
              type="number"
              min={1}
              value={form.longBreakMinutes}
              onChange={(e) => updateField("longBreakMinutes", Math.max(1, Number(e.target.value)))}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-ink">بدء الاستراحات تلقائياً</span>
          <ToggleSwitch
            checked={form.autoStartBreaks}
            onChange={(v) => updateField("autoStartBreaks", v)}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-ink">بدء البومودورو تلقائياً</span>
          <ToggleSwitch checked={form.autoStartFocus} onChange={(v) => updateField("autoStartFocus", v)} />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-muted">فاصل الاستراحة الطويلة</label>
          <input
            type="number"
            min={1}
            value={form.longBreakInterval}
            onChange={(e) => updateField("longBreakInterval", Math.max(1, Number(e.target.value)))}
            className={inputClasses}
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-muted">مستوى صوت المنبه</label>
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="range"
              min={0}
              max={100}
              value={form.alarmVolume}
              onChange={(e) => updateField("alarmVolume", Number(e.target.value))}
              className="w-full accent-gold"
            />
            <span className="w-10 shrink-0 text-xs text-muted">{form.alarmVolume}%</span>
            <button
              type="button"
              onClick={() => playAlarmSound(form.alarmVolume)}
              className="shrink-0 rounded-full border border-subtle px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-gold"
            >
              اختبار
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          disabled={saving}
          className="mt-6 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
        >
          إعادة تعيين جميع البيانات
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-subtle"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
