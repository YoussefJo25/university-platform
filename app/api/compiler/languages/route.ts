import { NextResponse } from "next/server";

const JUDGE0_BASE_URL = "https://judge0-ce.p.rapidapi.com";

export async function GET() {
  const apiKey = process.env.JUDGE0_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "الخدمة مش مفعّلة حاليًا (مفتاح Judge0 غير موجود)." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${JUDGE0_BASE_URL}/languages`, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "تعذّر تحميل قايمة اللغات." }, { status: 502 });
    }

    const languages = await response.json();
    return NextResponse.json(languages);
  } catch (error) {
    console.warn("Failed to fetch Judge0 languages:", error);
    return NextResponse.json({ error: "تعذّر تحميل قايمة اللغات." }, { status: 502 });
  }
}
