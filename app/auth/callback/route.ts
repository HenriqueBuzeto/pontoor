import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirect = searchParams.get("redirect") ?? "/app";

  return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(redirect)}&error=auth_disabled`);
}
