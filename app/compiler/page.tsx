"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

type Judge0Language = {
  id: number;
  name: string;
};

type RunResult = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
};

const MAX_CODE_LENGTH = 20000;
const DEFAULT_SNIPPET = "// اكتب الكود بتاعك هنا";

function getSnippetForLanguage(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("python")) return 'print("Hello, World!")';
  if (lower.includes("c++"))
    return '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}';
  if (lower.includes("c#"))
    return 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, World!");\n  }\n}';
  if (lower.includes("javascript") || lower.includes("node.js"))
    return 'console.log("Hello, World!");';
  if (lower.includes("typescript")) return 'console.log("Hello, World!");';
  if (lower.includes("java"))
    return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}';
  if (lower.includes("go"))
    return 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World!")\n}';
  if (lower.includes("rust")) return 'fn main() {\n  println!("Hello, World!");\n}';
  if (lower.includes("ruby")) return 'puts "Hello, World!"';
  if (lower.includes("php")) return '<?php\necho "Hello, World!";';
  if (lower.includes("kotlin")) return 'fun main() {\n  println("Hello, World!")\n}';
  if (lower.includes("swift")) return 'print("Hello, World!")';
  if (lower.includes("bash") || lower.includes("shell")) return 'echo "Hello, World!"';
  if (lower.startsWith("c (") || lower === "c")
    return '#include <stdio.h>\n\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}';

  return DEFAULT_SNIPPET;
}

function getMonacoLanguage(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("python")) return "python";
  if (lower.includes("c++")) return "cpp";
  if (lower.includes("c#")) return "csharp";
  if (lower.includes("typescript")) return "typescript";
  if (lower.includes("javascript") || lower.includes("node.js")) return "javascript";
  if (lower.includes("java")) return "java";
  if (lower.includes("go")) return "go";
  if (lower.includes("rust")) return "rust";
  if (lower.includes("ruby")) return "ruby";
  if (lower.includes("php")) return "php";
  if (lower.includes("kotlin")) return "kotlin";
  if (lower.includes("swift")) return "swift";
  if (lower.includes("bash") || lower.includes("shell")) return "shell";
  if (lower.startsWith("c (") || lower === "c") return "c";

  return "plaintext";
}

export default function CompilerPage() {
  const [languages, setLanguages] = useState<Judge0Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [code, setCode] = useState(DEFAULT_SNIPPET);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const selectedLanguage = languages.find((lang) => lang.id === selectedId) ?? null;

  useEffect(() => {
    async function loadLanguages() {
      try {
        const response = await fetch("/api/compiler/languages");
        const data = await response.json();

        if (!response.ok) {
          setLoadError(data?.error ?? "تعذّر تحميل قايمة اللغات.");
          return;
        }

        const list = data as Judge0Language[];
        setLanguages(list);

        const defaultLanguage =
          list.find((lang) => lang.name.toLowerCase().includes("python")) ??
          list.find((lang) => lang.name.toLowerCase().includes("c++")) ??
          list[0];

        if (defaultLanguage) {
          setSelectedId(defaultLanguage.id);
          setCode(getSnippetForLanguage(defaultLanguage.name));
        }
      } catch {
        setLoadError("تعذّر تحميل قايمة اللغات. تأكد من اتصالك بالإنترنت.");
      } finally {
        setLoadingLanguages(false);
      }
    }

    loadLanguages();
  }, []);

  function handleLanguageChange(idString: string) {
    const id = Number(idString);
    setSelectedId(id);
    const language = languages.find((lang) => lang.id === id);
    setCode(language ? getSnippetForLanguage(language.name) : DEFAULT_SNIPPET);
    setResult(null);
    setRunError(null);
  }

  async function handleRun() {
    setRunError(null);

    if (code.length > MAX_CODE_LENGTH) {
      setRunError(`الكود أطول من الحد المسموح به (${MAX_CODE_LENGTH.toLocaleString("ar-EG")} حرف).`);
      return;
    }

    if (!selectedLanguage) {
      setRunError("اختار لغة الأول.");
      return;
    }

    setResult(null);
    setRunning(true);

    try {
      const response = await fetch("/api/compiler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: selectedLanguage.id, source_code: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRunError(data?.error ?? "حصل خطأ أثناء تشغيل الكود.");
        return;
      }

      setResult(data as RunResult);
    } catch {
      setRunError("حصل خطأ أثناء تشغيل الكود. تأكد من اتصالك بالإنترنت وحاول تاني.");
    } finally {
      setRunning(false);
    }
  }

  const stderrCombined = result
    ? [result.compile_output, result.stderr, result.message].filter(Boolean).join("\n\n")
    : "";

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-10 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">كمبايلر أونلاين</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          اكتب كودك وشغّله فورًا من غير ما تحتاج أي إعداد
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="language" className="text-sm font-medium text-navy">
                اللغة
              </label>
              <select
                id="language"
                value={selectedId ?? ""}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={loadingLanguages || languages.length === 0}
                className="rounded-xl border border-navy/15 px-4 py-2 text-sm text-navy outline-none transition-colors focus:border-turquoise disabled:opacity-60"
              >
                {loadingLanguages && <option>جارٍ تحميل اللغات...</option>}
                {!loadingLanguages && languages.length === 0 && <option>لا توجد لغات متاحة</option>}
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={running || loadingLanguages || !selectedLanguage}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {running ? "جارٍ التشغيل..." : "تشغيل ▶"}
            </button>
          </div>

          {loadError && (
            <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {loadError}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-navy/10 shadow-sm">
            <Editor
              height="55vh"
              language={selectedLanguage ? getMonacoLanguage(selectedLanguage.name) : "plaintext"}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme="vs-dark"
              options={{ fontSize: 14, minimap: { enabled: false } }}
            />
          </div>

          <p className={`text-xs ${code.length > MAX_CODE_LENGTH ? "text-red-600" : "text-navy/50"}`}>
            {code.length.toLocaleString("ar-EG")} / {MAX_CODE_LENGTH.toLocaleString("ar-EG")} حرف
          </p>

          {runError && (
            <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {runError}
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-navy/10 bg-navy/5 p-4">
                <h2 className="mb-2 text-sm font-bold text-navy">المخرجات</h2>
                {result.status.description !== "Accepted" && (
                  <p className="mb-2 text-xs font-medium text-navy/60">
                    الحالة: {result.status.description}
                  </p>
                )}
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-navy/80">
                  {result.stdout || "لا يوجد مخرجات"}
                </pre>
              </div>

              {stderrCombined && (
                <div className="flex-1 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <h2 className="mb-2 text-sm font-bold text-red-700">الأخطاء</h2>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-red-600">
                    {stderrCombined}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
