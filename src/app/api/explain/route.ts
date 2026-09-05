// src/app/api/explain/route.ts -- Server-side AI explanation endpoint
// Keeps GEMINI_API_KEY server-side (never exposed to browser)
// Falls back to a word-specific static explanation when Gemini is unavailable.
// GAP-8 FIX: Uses canonical isDemoMode() from @/lib/demo-data (consistent across all routes).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getOrCreateRequestId, requestIdHeader } from "@/lib/request-id";
import { isDemoMode } from "@/lib/demo-data";

const requestSchema = z.object({
  word:     z.string().min(1).max(50),
  hiragana: z.string().min(1).max(50),
  lang:     z.enum(["en", "ja", "id"]).default("en"),
});

// AS-1 fix: 3 distinct variants chosen deterministically by word charsum hash.
// Same word always gets the same template. Not generic boilerplate.
function buildStaticExplanation(
  word: string,
  hiragana: string,
  lang: "en" | "ja" | "id"
): string {
  const charSum = word.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variant = charSum % 3;
  const syllables = hiragana.replace(/[ぁぃぅぇぉっゃゅょァィゥェォッャュョ]/g, "").length;
  const hasKanji = /[\u4e00-\u9faf]/.test(word);
  const syllableStr = syllables !== 1 ? "syllables" : "syllable";

  const templates: Record<"en" | "ja" | "id", string[]> = {
    en: [
      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      "**Pronunciation:** " + syllables + " " + syllableStr + ". Break it down: **" + hiragana.split("").join(" \u00B7 ") + "**\n\n" +
      (hasKanji
        ? "**Kanji tip:** Trace the strokes while saying \"" + hiragana + "\" aloud — muscle memory beats passive reading.\n\n"
        : "**Kana tip:** Written fully in kana — mastering the sound is the whole game here.\n\n") +
      "*Add a GEMINI_API_KEY to unlock grammar breakdowns and example sentences from AI Sensei.*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      "Appears frequently in " + (syllables <= 2 ? "everyday conversation" : "written Japanese and formal contexts") + ".\n\n" +
      "**Memory hook:** Link the sound **\"" + hiragana + "\"** to a vivid mental image of the meaning. The more absurd the image, the faster it sticks.\n\n" +
      "**Self-test:** Cover the word, say the reading from memory. Then reverse — hear the reading, write the word.\n\n" +
      "*Add a GEMINI_API_KEY for nuance notes, particle usage, and common learner mistakes.*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      (hasKanji
        ? "**Kanji breakdown:** Each character in " + word + " carries semantic weight. Understanding the radicals makes the whole word intuitive and far harder to forget.\n\n"
        : "**Sound pattern:** \"" + hiragana + "\" has a " + (syllables <= 2 ? "short, punchy" : "longer, rhythmic") + " feel. Group it with words sharing similar sounds.\n\n") +
      "**Spaced repetition:** Review in 1 day \u2192 3 days \u2192 7 days \u2192 21 days.\n\n" +
      "*Add a GEMINI_API_KEY for conjugations, example sentences, and JLPT-level context.*",
    ],
    id: [
      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      "**Pengucapan:** " + syllables + " suku kata. Pecah: **" + hiragana.split("").join(" \u00B7 ") + "**\n\n" +
      (hasKanji
        ? "**Tips kanji:** Telusuri goresan sambil mengucapkan \"" + hiragana + "\" — memori otot jauh lebih kuat dari membaca pasif.\n\n"
        : "**Tips kana:** Ditulis penuh dalam kana — kuasai bunyinya adalah segalanya.\n\n") +
      "*Tambahkan GEMINI_API_KEY untuk grammar lengkap dan kalimat contoh dari AI Sensei.*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      "Sering muncul dalam " + (syllables <= 2 ? "percakapan sehari-hari" : "bahasa tulis dan konteks formal") + ".\n\n" +
      "**Kait memori:** Hubungkan bunyi **\"" + hiragana + "\"** dengan gambaran mental yang hidup. Semakin absurd, semakin cepat menempel.\n\n" +
      "*Tambahkan GEMINI_API_KEY untuk catatan nuansa, partikel, dan kesalahan umum.*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      (hasKanji
        ? "**Analisis kanji:** Setiap karakter di " + word + " punya bobot semantik. Pelajari radikalnya.\n\n"
        : "**Pola bunyi:** \"" + hiragana + "\" punya rasa " + (syllables <= 2 ? "pendek dan tegas" : "panjang dan berirama") + ".\n\n") +
      "**Spaced repetition:** Ulangi 1 hari \u2192 3 hari \u2192 7 hari \u2192 21 hari.\n\n" +
      "*Tambahkan GEMINI_API_KEY untuk konjugasi, contoh kalimat, dan konteks JLPT.*",
    ],
    ja: [
      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      "**\u767a\u97f3:** " + syllables + "\u97f3\u7bc0\u3002\u533a\u5207\u308a: **" + hiragana.split("").join("\u30FB") + "**\n\n" +
      (hasKanji
        ? "**\u6f22\u5b57\u306e\u30b3\u30c4:** \u300c" + hiragana + "\u300d\u3068\u58f0\u306b\u51fa\u3057\u306a\u304c\u3089\u7b46\u9806\u3092\u305f\u3069\u308b\u3068\u3001\u4f53\u306e\u8a18\u61b6\u3068\u3057\u3066\u5b9a\u7740\u3057\u307e\u3059\u3002\n\n"
        : "**\u304b\u306a\u306e\u30b3\u30c4:** \u3053\u306e\u5358\u8a9e\u306f\u304b\u306a\u306e\u307f\u3067\u3059\u3002\u97f3\u3092\u30de\u30b9\u30bf\u30fc\u3059\u308b\u3053\u3068\u304c\u5168\u3066\u3067\u3059\u3002\n\n") +
      "*GEMINI_API_KEY\u3092\u8ffd\u52a0\u3059\u308b\u3068\u3001AI\u5148\u751f\u306e\u6587\u6cd5\u89e3\u8aac\u3068\u4f8b\u6587\u304c\u4f7f\u3048\u307e\u3059\u3002*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      (syllables <= 2 ? "\u65e5\u5e38\u4f1a\u8a71" : "\u66f8\u304d\u8a00\u8449\u3084\u6539\u307e\u3063\u305f\u5834\u9762") + "\u3067\u3088\u304f\u4f7f\u308f\u308c\u307e\u3059\u3002\n\n" +
      "**\u8a18\u61b6\u306e\u30d5\u30c3\u30af:** **\u300c" + hiragana + "\u300d**\u3068\u3044\u3046\u97f3\u3068\u610f\u5473\u3092\u7d50\u3076\u3001\u9BAE\u660e\u306a\u30a4\u30e1\u30fc\u30b8\u3092\u4f5c\u308a\u307e\u3057\u3087\u3046\u3002\u5947\u6291\u306a\u307b\u3069\u52b9\u679c\u7684\u3067\u3059\u3002\n\n" +
      "*GEMINI_API_KEY\u3092\u8ffd\u52a0\u3059\u308b\u3068\u3001\u30cb\u30e5\u30a2\u30f3\u30b9\u306e\u89e3\u8aac\u3068\u4f8b\u6587\u304c\u4f7f\u3048\u307e\u3059\u3002*",

      "## " + word + "\uFF08" + hiragana + "\uFF09\n\n" +
      (hasKanji
        ? "**\u6f22\u5b57\u306e\u5206\u6790:** " + word + "\u306e\u5404\u6587\u5b57\u306b\u306f\u610f\u5473\u304c\u3042\u308a\u307e\u3059\u3002\u90e8\u9996\u3092\u7406\u89e3\u3059\u308b\u3068\u3001\u5358\u8a9e\u5168\u4f53\u304c\u76f4\u611f\u7684\u306b\u899a\u3048\u3089\u308c\u307e\u3059\u3002\n\n"
        : "**\u97f3\u306e\u30d1\u30bf\u30fc\u30f3:** \u300c" + hiragana + "\u300d\u306f" + (syllables <= 2 ? "\u77ed\u304f\u30ea\u30ba\u30df\u30ab\u30eb" : "\u9577\u3081\u306e\u30ea\u30ba\u30e0") + "\u3067\u3059\u3002\n\n") +
      "**\u9593\u9694\u53cd\u5fa9:** 1\u65e5\u5f8c \u2192 3\u65e5\u5f8c \u2192 7\u65e5\u5f8c \u2192 21\u65e5\u5f8c\u306b\u5fa9\u7fd2\u3002\n\n" +
      "*GEMINI_API_KEY\u3092\u8ffd\u52a0\u3059\u308b\u3068\u3001\u6d3b\u7528\u3001\u4f8b\u6587\u3001JLPT\u30ec\u30d9\u30eb\u306e\u30b3\u30f3\u30c6\u30ad\u30b9\u30c8\u304c\u5206\u304b\u308a\u307e\u3059\u3002*",
    ],
  };

  return templates[lang][variant] ?? templates[lang][0] ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const reqId = getOrCreateRequestId(request);

  // 1. Rate Limiting -- 5 requests / 60 s (Gemini API cost protection)
  const rl = await checkRateLimit(request, { limit: 5, windowMs: 60_000 });
  const rlHeaders = rateLimitHeaders(rl, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a minute.", retryAfter: rlHeaders["Retry-After"], requestId: reqId } },
      { status: 429, headers: { ...rlHeaders, ...requestIdHeader(reqId) } }
    );
  }

  // 2. Payload Validation (before any I/O)
  let parsedWord = "";
  let parsedHiragana = "";
  let parsedLang: "en" | "ja" | "id" = "en";
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format(), requestId: reqId },
        { status: 400, headers: requestIdHeader(reqId) }
      );
    }
    parsedWord     = parsed.data.word;
    parsedHiragana = parsed.data.hiragana;
    parsedLang     = parsed.data.lang;
  } catch {
    return NextResponse.json({ error: "Malformed request body", requestId: reqId }, { status: 400, headers: requestIdHeader(reqId) });
  }

  // 3. Demo Mode shortcut -- GEMINI_API_KEY not configured
  if (isDemoMode()) {
    return NextResponse.json(
      { explanation: buildStaticExplanation(parsedWord, parsedHiragana, parsedLang), cached: false, _demo: true },
      { headers: { "X-NihongoQuest-Mode": "demo" } }
    );
  }

  // 4. Auth Check (Zero Trust)
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const { cookies }            = await import("next/headers");
    const cookieStore            = await cookies();
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]      ?? "",
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only route handler */ },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", requestId: reqId }, { status: 401, headers: requestIdHeader(reqId) });
    }
  } catch {
    // Supabase unavailable -- auth cannot be verified. Fallback; AI explain is read-only.
    return NextResponse.json(
      { explanation: buildStaticExplanation(parsedWord, parsedHiragana, parsedLang), cached: false, _fallback: true },
      { headers: { "X-NihongoQuest-AI-Fallback": "auth-unavailable", ...requestIdHeader(reqId) } }
    );
  }

  // 5. AI Explanation -- resilient: static fallback if Gemini unavailable
  try {
    const { AiExplainerService } = await import("@/features/ai-explainer/AiExplainerService");
    const explanation = await AiExplainerService.explainGrammar(parsedWord, parsedHiragana, parsedLang);
    return NextResponse.json({ explanation, cached: false }, { headers: requestIdHeader(reqId) });
  } catch {
    // Gemini call failed (invalid key, quota exceeded, network error, etc.)
    // Return helpful static explanation -- never return 500 to the client.
    return NextResponse.json(
      { explanation: buildStaticExplanation(parsedWord, parsedHiragana, parsedLang), cached: false, _fallback: true },
      { headers: { "X-NihongoQuest-AI-Fallback": "gemini-unavailable", ...requestIdHeader(reqId) } }
    );
  }
}

// Local isDemoMode removed — GAP-8 FIX: use canonical @/lib/demo-data#isDemoMode instead.
// Previous local impl checked !GEMINI_API_KEY; canonical checks DATABASE_URL + SUPABASE_URL.
