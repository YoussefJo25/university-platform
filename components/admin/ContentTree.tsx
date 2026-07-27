"use client";

import { useMemo, useState, type ReactNode } from "react";

type TreeUniversity = { id: number; name: string };
type TreeYear = { id: number; name: string; university_id: number | null };
type TreeTerm = { id: number; name: string; year_id: number };
type TreeCourse = {
  id: number;
  name: string;
  year_id: number | null;
  term_id: number | null;
  category: "academic" | "learning_path";
  parent_course_id: number | null;
  order_index: number;
};

type ContentTreeProps = {
  universities: TreeUniversity[];
  years: TreeYear[];
  terms: TreeTerm[];
  courses: TreeCourse[];
  selectedCourseId: number | null;
  onSelectCourse: (courseId: number) => void;
  showLearningPath?: boolean;
  // بيتقفل مؤقتًا (اختيار جديد ممنوع) وقت أي عملية حفظ شغالة فعلًا في
  // التاب اللي بيستخدم الشجرة، عشان مايبقاش فيه احتمال إن الأدمن يغيّر
  // اختياره وسط عملية حفظ لسه ماخلصتش ويحصل لبس عن أنهي مادة اتحفظ ليها
  // الحاجة اللي بيضيفها.
  disabled?: boolean;
  // لو موجودة، بيظهر جنب كل مادة/قسم (في وضع التصفح العادي بس، مش نتايج
  // البحث، عشان الترتيب مالوش معنى غير جوه مجموعة إخوة واحدة) حقل رقمي
  // صغير لترتيبها بين إخواتها (تحت نفس الأب/الترم). مش موجودة يعني
  // الشجرة للتصفح والاختيار بس (زي تابي الكتب والفيديوهات).
  onReorder?: (courseId: number, newOrderIndex: number) => void;
  // لو موجودة، بيظهر زرار "نسخ" صغير جنب كل مادة/قسم (وضع التصفح العادي
  // بس، زي onReorder) — مش موجودة يعني ميزة النسخ متاحة أصلًا للمستخدم
  // الحالي (super_admin بس، حسب duplicate_course_setup.sql).
  onDuplicate?: (courseId: number) => void;
};

const CHEVRON_PATH = "M8.25 4.5l7.5 7.5-7.5 7.5";

export default function ContentTree({
  universities,
  years,
  terms,
  courses,
  selectedCourseId,
  onSelectCourse,
  showLearningPath = true,
  disabled = false,
  onReorder,
  onDuplicate,
}: ContentTreeProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["root-universities", "root-learning-path"])
  );

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // بنلف onSelectCourse بيها بدل ما نبعتها زي ما هي لكل حاجة قابلة
  // للاختيار في الشجرة، عشان أي مكان بيستخدمها (مباشر أو جوه LearningPathNode
  // المتداخلة) يحترم الإغلاق المؤقت تلقائيًا من غير ما نكرر الشرط كل مكان.
  function selectCourse(courseId: number) {
    if (disabled) return;
    onSelectCourse(courseId);
  }

  function duplicateCourse(courseId: number) {
    if (disabled || !onDuplicate) return;
    onDuplicate(courseId);
  }

  function academicPath(course: TreeCourse): string {
    const year = years.find((y) => y.id === course.year_id);
    const university = universities.find((u) => u.id === year?.university_id);
    const term = terms.find((t) => t.id === course.term_id);
    return [university?.name, year?.name, term?.name].filter(Boolean).join(" ← ");
  }

  function learningPathPath(course: TreeCourse): string {
    const parts: string[] = [];
    let current: TreeCourse | undefined = course;
    const seen = new Set<number>();
    while (current?.parent_course_id && !seen.has(current.parent_course_id)) {
      seen.add(current.parent_course_id);
      const parent = courses.find((c) => c.id === current!.parent_course_id);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }
    return ["مسارات تعلم البرمجة", ...parts].join(" ← ");
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return courses
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((course) => ({
        course,
        path: course.category === "academic" ? academicPath(course) : learningPathPath(course),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, courses, years, universities, terms]);

  const learningPathRoots = courses.filter(
    (c) => c.category === "learning_path" && !c.parent_course_id
  );

  function childrenOf(courseId: number): TreeCourse[] {
    return courses.filter((c) => c.category === "learning_path" && c.parent_course_id === courseId);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-card p-4 shadow-sm">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن مادة..."
        className="w-full rounded-xl border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold"
      />

      <div
        className={`flex max-h-[60vh] flex-col gap-1 overflow-y-auto ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {query.trim() ? (
          matches.length === 0 ? (
            <p className="p-2 text-sm text-muted">لا توجد نتائج</p>
          ) : (
            matches.map(({ course, path }) => (
              <button
                key={course.id}
                type="button"
                onClick={() => selectCourse(course.id)}
                className={`flex flex-col rounded-lg px-3 py-2 text-right transition-colors ${
                  selectedCourseId === course.id ? "bg-gold/10 text-gold" : "text-ink hover:bg-panel"
                }`}
              >
                <span className="text-sm font-semibold">{course.name}</span>
                <span className="text-xs text-muted">{path}</span>
              </button>
            ))
          )
        ) : (
          <>
            <TreeBranch label="الجامعات" nodeKey="root-universities" expanded={expanded} onToggle={toggle}>
              {universities.map((university) => (
                <TreeBranch
                  key={university.id}
                  label={university.name}
                  nodeKey={`uni-${university.id}`}
                  expanded={expanded}
                  onToggle={toggle}
                  depth={1}
                >
                  {years
                    .filter((y) => y.university_id === university.id)
                    .map((year) => (
                      <TreeBranch
                        key={year.id}
                        label={year.name}
                        nodeKey={`year-${year.id}`}
                        expanded={expanded}
                        onToggle={toggle}
                        depth={2}
                      >
                        {terms
                          .filter((t) => t.year_id === year.id)
                          .map((term) => (
                            <TreeBranch
                              key={term.id}
                              label={term.name}
                              nodeKey={`term-${term.id}`}
                              expanded={expanded}
                              onToggle={toggle}
                              depth={3}
                            >
                              {courses
                                .filter((c) => c.category === "academic" && c.term_id === term.id)
                                .map((course) => (
                                  <TreeLeaf
                                    key={course.id}
                                    label={course.name}
                                    depth={4}
                                    selected={selectedCourseId === course.id}
                                    onClick={() => selectCourse(course.id)}
                                    orderIndex={course.order_index}
                                    onReorder={
                                      onReorder ? (value) => onReorder(course.id, value) : undefined
                                    }
                                    onDuplicate={
                                      onDuplicate ? () => duplicateCourse(course.id) : undefined
                                    }
                                  />
                                ))}
                            </TreeBranch>
                          ))}
                      </TreeBranch>
                    ))}
                </TreeBranch>
              ))}
            </TreeBranch>

            {showLearningPath && (
              <TreeBranch
                label="مسارات تعلم البرمجة"
                nodeKey="root-learning-path"
                expanded={expanded}
                onToggle={toggle}
              >
                {learningPathRoots.map((course) => (
                  <LearningPathNode
                    key={course.id}
                    course={course}
                    depth={1}
                    childrenOf={childrenOf}
                    expanded={expanded}
                    onToggle={toggle}
                    selectedCourseId={selectedCourseId}
                    onSelectCourse={selectCourse}
                    onReorder={onReorder}
                    onDuplicate={onDuplicate ? duplicateCourse : undefined}
                  />
                ))}
              </TreeBranch>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "-rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={CHEVRON_PATH} />
    </svg>
  );
}

function TreeBranch({
  label,
  nodeKey,
  depth = 0,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  nodeKey: string;
  depth?: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  children: ReactNode[];
}) {
  const isOpen = expanded.has(nodeKey);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(nodeKey)}
        style={{ paddingRight: `${depth * 14 + 8}px` }}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-right text-sm font-semibold text-ink transition-colors hover:bg-panel"
      >
        <Chevron open={isOpen} />
        {label}
      </button>
      {isOpen && hasChildren && <div className="flex flex-col gap-1">{children}</div>}
      {isOpen && !hasChildren && (
        <p
          style={{ paddingRight: `${(depth + 1) * 14 + 8}px` }}
          className="py-1 text-xs text-muted"
        >
          فاضي
        </p>
      )}
    </div>
  );
}

function TreeLeaf({
  label,
  depth,
  selected,
  onClick,
  orderIndex,
  onReorder,
  onDuplicate,
}: {
  label: string;
  depth: number;
  selected: boolean;
  onClick: () => void;
  orderIndex?: number;
  onReorder?: (newOrderIndex: number) => void;
  onDuplicate?: () => void;
}) {
  return (
    <div className="flex items-center gap-1" style={{ paddingRight: `${depth * 14 + 8}px` }}>
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-lg px-2 py-1.5 text-right text-sm transition-colors ${
          selected ? "bg-gold/10 font-semibold text-gold" : "text-muted hover:bg-panel hover:text-ink"
        }`}
      >
        {label}
      </button>
      {onReorder && (
        <input
          type="number"
          defaultValue={orderIndex ?? 0}
          title="الترتيب بين إخوتها"
          onBlur={(e) => {
            const value = Number(e.target.value) || 0;
            if (value !== orderIndex) onReorder(value);
          }}
          className="w-12 shrink-0 rounded-lg border border-subtle bg-panel px-1.5 py-1 text-center text-xs text-ink outline-none focus:border-gold"
        />
      )}
      {onDuplicate && (
        <button
          type="button"
          onClick={onDuplicate}
          title="نسخ المادة"
          className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          📋
        </button>
      )}
    </div>
  );
}

function LearningPathNode({
  course,
  depth,
  childrenOf,
  expanded,
  onToggle,
  selectedCourseId,
  onSelectCourse,
  onReorder,
  onDuplicate,
}: {
  course: TreeCourse;
  depth: number;
  childrenOf: (id: number) => TreeCourse[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  selectedCourseId: number | null;
  onSelectCourse: (id: number) => void;
  onReorder?: (courseId: number, newOrderIndex: number) => void;
  onDuplicate?: (courseId: number) => void;
}) {
  const children = childrenOf(course.id);
  const nodeKey = `course-${course.id}`;
  const isOpen = expanded.has(nodeKey);
  const isSelected = selectedCourseId === course.id;

  if (children.length === 0) {
    return (
      <TreeLeaf
        label={course.name}
        depth={depth}
        selected={isSelected}
        onClick={() => onSelectCourse(course.id)}
        orderIndex={course.order_index}
        onReorder={onReorder ? (value) => onReorder(course.id, value) : undefined}
        onDuplicate={onDuplicate ? () => onDuplicate(course.id) : undefined}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1" style={{ paddingRight: `${depth * 14 + 8}px` }}>
        <button
          type="button"
          onClick={() => onToggle(nodeKey)}
          className="shrink-0 p-1 text-ink"
          aria-label={isOpen ? "طي" : "توسيع"}
        >
          <Chevron open={isOpen} />
        </button>
        <button
          type="button"
          onClick={() => onSelectCourse(course.id)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-right text-sm transition-colors ${
            isSelected ? "bg-gold/10 font-semibold text-gold" : "text-ink hover:bg-panel"
          }`}
        >
          {course.name}
        </button>
        {onReorder && (
          <input
            type="number"
            defaultValue={course.order_index}
            title="الترتيب بين إخوتها"
            onBlur={(e) => {
              const value = Number(e.target.value) || 0;
              if (value !== course.order_index) onReorder(course.id, value);
            }}
            className="w-12 shrink-0 rounded-lg border border-subtle bg-panel px-1.5 py-1 text-center text-xs text-ink outline-none focus:border-gold"
          />
        )}
        {onDuplicate && (
          <button
            type="button"
            onClick={() => onDuplicate(course.id)}
            title="نسخ المادة"
            className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            📋
          </button>
        )}
      </div>
      {isOpen && (
        <div className="flex flex-col gap-1">
          {children.map((child) => (
            <LearningPathNode
              key={child.id}
              course={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              onToggle={onToggle}
              selectedCourseId={selectedCourseId}
              onSelectCourse={onSelectCourse}
              onReorder={onReorder}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
