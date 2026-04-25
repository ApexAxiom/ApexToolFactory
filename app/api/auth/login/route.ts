import { NextResponse } from "next/server";
import { OrganizationMembership } from "@/domain/types";
import { env } from "@/config/env";
import { createSessionCookie } from "@/server/auth/session";
import { respondToMfaChallenge, signInWithPassword, startTotpSetup } from "@/server/auth/cognito";
import { getStore } from "@/server/persistence/store";
import { createOrganization } from "@/server/services/organizations";

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
        : isLocalDevLogin(email, String(body.password || ""))
          ? {
              profile: {
                userId: `local-dev:${email}`,
                email,
                displayName: "Local Dev User",
                emailVerified: true
              }
            }
          : await signInWithPassword(email, String(body.password || ""));

    if (authResult.challengeName === "MFA_SETUP" && authResult.session) {
      const setup = await startTotpSetup(authResult.session);
      return NextResponse.json({
        ok: true,
        requiresMfaSetup: true,
        challengeName: authResult.challengeName,
        challengeSession: setup.session,
        secretCode: setup.secretCode
      });
    }

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
    let activeMemberships = memberships
      .filter(
        (membership) =>
          membership.status === "ACTIVE" &&
          (membership.userId === authResult.profile?.userId || membership.email.toLowerCase() === email)
      )
      .map((membership) => ({
        organizationId: membership.organizationId,
        role: membership.role
      }));

    if (activeMemberships.length === 0 && isLocalDevLogin(email, String(body.password || ""))) {
      const created = await createOrganization({
        name: "Pestimator Local Workspace",
        timezone: "America/Chicago",
        owner: {
          userId: authResult.profile.userId,
          email,
          displayName: authResult.profile.displayName,
          emailVerified: true,
          memberships: []
        }
      });
      activeMemberships = [{ organizationId: created.organization.id, role: "OWNER" }];
    }

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

function isLocalDevLogin(email: string, password: string) {
  return (
    (env.NODE_ENV !== "production" || env.LOCAL_DEV_LOGIN_ENABLED === "true") &&
    Boolean(env.LOCAL_DEV_LOGIN_EMAIL) &&
    Boolean(env.LOCAL_DEV_LOGIN_PASSWORD) &&
    email === env.LOCAL_DEV_LOGIN_EMAIL?.toLowerCase() &&
    password === env.LOCAL_DEV_LOGIN_PASSWORD
  );
}
