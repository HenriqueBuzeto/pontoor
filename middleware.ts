import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserIdFromRequest } from "@/lib/auth/session-cookie";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const userId = await getSessionUserIdFromRequest(request);
  if (!userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
