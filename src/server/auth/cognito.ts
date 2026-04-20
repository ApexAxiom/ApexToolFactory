import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { env } from "@/config/env";
import { decodeIdToken } from "@/server/auth/session";

const client = new CognitoIdentityProviderClient({
  region: env.AWS_REGION
});

export interface CognitoChallengeResult {
  challengeName?: string;
  session?: string;
  message?: string;
}

export interface CognitoAuthResult extends CognitoChallengeResult {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  profile?: {
    userId: string;
    email: string;
    displayName?: string;
    emailVerified: boolean;
  };
}

function assertCognitoConfig() {
  if (!env.COGNITO_CLIENT_ID) {
    throw new Error("COGNITO_CLIENT_ID is not configured");
  }
}

export async function signInWithPassword(email: string, password: string): Promise<CognitoAuthResult> {
  assertCognitoConfig();

  const response = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })
  );

  if (response.ChallengeName) {
    return {
      challengeName: response.ChallengeName,
      session: response.Session,
      message: "Additional authentication is required"
    };
  }

  return hydrateAuthResult(response.AuthenticationResult);
}

export async function respondToMfaChallenge(input: {
  email: string;
  code: string;
  challengeName: string;
  session: string;
}): Promise<CognitoAuthResult> {
  assertCognitoConfig();

  const challengeResponses: Record<string, string> = {
    USERNAME: input.email
  };

  if (input.challengeName === "SOFTWARE_TOKEN_MFA") {
    challengeResponses.SOFTWARE_TOKEN_MFA_CODE = input.code;
  } else if (input.challengeName === "SMS_MFA") {
    challengeResponses.SMS_MFA_CODE = input.code;
  } else if (input.challengeName === "EMAIL_OTP") {
    challengeResponses.EMAIL_OTP_CODE = input.code;
  } else {
    throw new Error(`Unsupported challenge: ${input.challengeName}`);
  }

  const response = await client.send(
    new RespondToAuthChallengeCommand({
      ChallengeName: input.challengeName,
      ClientId: env.COGNITO_CLIENT_ID,
      Session: input.session,
      ChallengeResponses: challengeResponses
    })
  );

  return hydrateAuthResult(response.AuthenticationResult);
}

function hydrateAuthResult(authenticationResult?: {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
}) {
  if (!authenticationResult?.IdToken || !authenticationResult.AccessToken) {
    throw new Error("Authentication did not return valid tokens");
  }

  const claims = decodeIdToken(authenticationResult.IdToken);
  if (!claims.email) {
    throw new Error("Authenticated user is missing an email address");
  }
  if (!claims.email_verified) {
    throw new Error("Authenticated email is not verified");
  }

  return {
    idToken: authenticationResult.IdToken,
    accessToken: authenticationResult.AccessToken,
    refreshToken: authenticationResult.RefreshToken,
    profile: {
      userId: claims.sub || claims.email,
      email: claims.email,
      displayName: claims.name,
      emailVerified: Boolean(claims.email_verified)
    }
  } satisfies CognitoAuthResult;
}
