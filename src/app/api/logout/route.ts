import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/jwt"

async function handleLogout(req: Request) {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  // Redirect relative to the incoming request's origin so it always lands
  // on whatever host/port the app is actually running on.
  // 303 makes browsers follow with GET after a POST form submission.
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 })
}

export async function POST(req: Request) {
  return handleLogout(req)
}

export async function GET(req: Request) {
  return handleLogout(req)
}
