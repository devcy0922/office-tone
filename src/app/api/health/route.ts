import { NextResponse } from "next/server";

import { govailConfig } from "@/lib/ai/govail";

export const dynamic = "force-dynamic";

export async function GET() {
  const { model, baseUrl } = govailConfig();
  return NextResponse.json({
    ok: true,
    service: "office-tone",
    model,
    provider: "govail",
    baseHost: new URL(baseUrl).host,
  });
}
