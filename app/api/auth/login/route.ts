import { NextResponse } from "next/server";
import { OrganizationMembership } from "@/domain/types";
import { createSessionCookie } from "@/server/auth/session";
import { respondToMfaChallenge, signInWithPassword } from "@/server/auth/cognito";
import { getStore } from "@/server/persistence/store";

interface LoginBody {
  email?: string;
  password?: string;
  mfaCode?: string;
  challengeName?: string;
  challengeSession?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const authResult =
      body.challengeName && body.challengeSession && body.mfaCode
        ? await respondToMfaChallenge({
            email,
            code: body.mfaCode,
            challengeName: body.challengeName,
            session: body.challengeSession
          })
        : await signInWithPassword(email, String(body.password || ""));

    if (authResult.challengeName && authResult.session) {
      return NextResponse.json({
        ok: true,
        requiresMfa: true,
        challengeName: authResult.challengeName,
        challengeSession: authResult.session
      });
    }

    if (!authResult.profile) {
      throw new Error("Authentication did not return a user profile");
    }

    const memberships = await getStore().list<OrganizationMembership>("organizationMemberships");
    const activeMemberships = memberships
      .filter(
        (membership) =>
          membership.status === "ACTIVE" &&
          (membership.userId === authResult.profile?.userId || membership.email.toLowerCase() === email)
      )
      .map((membership) => ({
        organizationId: membership.organizationId,
        role: membership.role
      }));

    await createSessionCookie({
      userId: authResult.profile.userId,
      email,
      displayName: authResult.profile.displayName,
      emailVerified: authResult.profile.emailVerified,
      memberships: activeMemberships
    });

    return NextResponse.json({
      ok: true,
      redirectTo: activeMemberships.length > 0 ? "/app/dashboard" : "/app/settings"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
