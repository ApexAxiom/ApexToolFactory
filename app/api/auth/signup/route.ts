import { NextResponse } from "next/server";
import { confirmSignUp, signUpWithPassword } from "@/server/auth/cognito";
import { createOrganization } from "@/server/services/organizations";

interface SignupBody {
  companyName?: string;
  displayName?: string;
  email?: string;
  password?: string;
  confirmationCode?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const companyName = String(body.companyName || "").trim();
    const displayName = String(body.displayName || "").trim() || undefined;
    const confirmationCode = String(body.confirmationCode || "").trim();

    if (!email) return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    if (!companyName) return NextResponse.json({ ok: false, error: "Company name is required" }, { status: 400 });

    if (confirmationCode) {
      await confirmSignUp({ email, code: confirmationCode });
      return NextResponse.json({ ok: true, redirectTo: "/login" });
    }

    if (!password) return NextResponse.json({ ok: false, error: "Password is required" }, { status: 400 });

    const signup = await signUpWithPassword({
      email,
      password,
      displayName
    });

    await createOrganization({
      name: companyName,
      timezone: "America/Chicago",
      owner: {
        userId: signup.userSub,
        email,
        displayName,
        emailVerified: signup.userConfirmed,
        memberships: []
      }
    });

    return NextResponse.json({
      ok: true,
      requiresConfirmation: !signup.userConfirmed,
      redirectTo: signup.userConfirmed ? "/login" : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
