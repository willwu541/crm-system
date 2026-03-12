import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/quote"];
const apiPublicPrefix = "/api/quote";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开页面
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (pathname.startsWith(apiPublicPrefix)) {
    return NextResponse.next();
  }

  // 静态资源、api/auth 等
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 其他页面需要登录，通过服务端 getSession 判断
  // 这里只做路径放行，实际鉴权在 layout 或 page 中做
  return NextResponse.next();
}
