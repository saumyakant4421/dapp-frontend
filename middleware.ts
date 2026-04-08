import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {

  const url = req.nextUrl;

  if (url.pathname.startsWith("/influencer/dashboard")) {

    const wallet = req.cookies.get("wallet")?.value;

    if (!wallet) {
      return NextResponse.redirect(new URL("/influencer/login", req.url));
    }

    try {

      const res = await fetch(`${req.nextUrl.origin}/api/influencer/${wallet}`);

      if (!res.ok) {
        return NextResponse.redirect(new URL("/influencer/onboard", req.url));
      }

      const influencer = await res.json();

      if (!influencer.exists) {
        return NextResponse.redirect(new URL("/influencer/onboard", req.url));
      }

    } catch (err) {
      console.error("Middleware error:", err);
      return NextResponse.redirect(new URL("/influencer/login", req.url));
    }

  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/influencer/dashboard/:path*"]
};