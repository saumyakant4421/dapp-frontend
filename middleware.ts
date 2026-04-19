import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const wallet = req.cookies.get("wallet")?.value?.trim().toLowerCase();

  const isInfluencerPath = url.pathname.startsWith("/influencer/dashboard");
  const isBrandPath =
    url.pathname.startsWith("/dashboard") ||
    url.pathname === "/campaign" ||
    url.pathname.startsWith("/campaign/");

  if (!isInfluencerPath && !isBrandPath) {
    return NextResponse.next();
  }

  if (!wallet) {
    if (isInfluencerPath) {
      return NextResponse.redirect(new URL("/influencer/login", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  type ResolveResponse = {
    success: boolean;
    roles?: {
      brand?: { company_id: string } | null;
      influencer?: { influencer_id: string } | null;
    };
    hasMultipleRoles?: boolean;
  };

  try {
    const res = await fetch(
      `${req.nextUrl.origin}/api/auth/resolve?wallet=${encodeURIComponent(wallet)}`
    );

    if (!res.ok) {
      return NextResponse.redirect(
        new URL(isInfluencerPath ? "/influencer/login" : "/login", req.url)
      );
    }

    const auth = (await res.json()) as ResolveResponse;

    if (!auth.success || auth.hasMultipleRoles) {
      const redirectPath = isInfluencerPath ? "/influencer/login" : "/login";
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    const hasBrand = Boolean(auth.roles?.brand);
    const hasInfluencer = Boolean(auth.roles?.influencer);

    if (isInfluencerPath && !hasInfluencer) {
      if (hasBrand) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/influencer/onboard", req.url));
    }

    if (isBrandPath && !hasBrand) {
      if (hasInfluencer) {
        return NextResponse.redirect(new URL("/influencer/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch (err) {
    console.error("Middleware error:", err);
    return NextResponse.redirect(
      new URL(isInfluencerPath ? "/influencer/login" : "/login", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/influencer/dashboard/:path*", "/dashboard/:path*", "/campaign/:path*"],
};