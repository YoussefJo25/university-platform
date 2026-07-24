import { NextResponse } from "next/server";

const JUDGE0_BASE_URL = "https://judge0-ce.p.rapidapi.com";
const MAX_CODE_LENGTH = 20000;
const RUN_TIMEOUT_MS = 18000;

export async function POST(request: Request) {
  const apiKey = process.env.JUDGE0_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "الخدمة مش مفعّلة حاليًا (مفتاح Judge0 غير موجود)." },
      { status: 503 }
    );
  }

  let body: { language_id?: number; source_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const languageId = body.language_id;
  const sourceCode = body.source_code;

  if (!languageId || typeof sourceCode !== "string" || !sourceCode.trim()) {
    return NextResponse.json({ error: "لازم تختار لغة وتكتب كود." }, { status: 400 });
  }

  if (sourceCode.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: `الكود أطول من الحد المسموح به (${MAX_CODE_LENGTH} حرف).` },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ language_id: languageId, source_code: sourceCode }),
        signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "فشل تشغيل الكود. حاول تاني." }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "الخدمة بتاخد وقت أطول من المعتاد، حاول تاني." },
        { status: 504 }
      );
    }

    console.warn("Failed to run code via Judge0:", error);
    return NextResponse.json({ error: "حصل خطأ أثناء تشغيل الكود." }, { status: 502 });
  }
}
