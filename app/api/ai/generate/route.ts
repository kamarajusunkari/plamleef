import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? process.env.NEXT_PUBLIC_OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL ?? process.env.NEXT_PUBLIC_OPENAI_MODEL ?? "mimo-v2.5-free";

export async function POST(req: NextRequest) {
  const { prompt, temperature = 0.7, max_tokens = 8192 } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ content });
}
