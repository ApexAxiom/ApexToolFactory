import {
  AssociateSoftwareTokenCommand,
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  VerifySoftwareTokenCommand
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

export interface CognitoSignUpResult {
  userSub: string;
  userConfirmed: boolean;
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

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  assertCognitoConfig();

  const response = await client.send(
    new SignUpCommand({
      ClientId: env.COGNITO_CLIENT_ID,
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        ...(input.displayName ? [{ Name: "name", Value: input.displayName }] : [])
      ]
    })
  );

  if (!response.UserSub) {
    throw new Error("Cognito did not return a user id");
  }

  return {
    userSub: response.UserSub,
    userConfirmed: Boolean(response.UserConfirmed)
  } satisfies CognitoSignUpResult;
}

export async function confirmSignUp(input: { email: string; code: string }) {
  assertCognitoConfig();
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: env.COGNITO_CLIENT_ID,
      Username: input.email,
      ConfirmationCode: input.code
    })
  );
}

export async function startTotpSetup(session: string) {
  const response = await client.send(
    new AssociateSoftwareTokenCommand({
      Session: session
    })
  );

  if (!response.SecretCode || !response.Session) {
    throw new Error("Cognito did not return a TOTP setup secret");
  }

  return {
    secretCode: response.SecretCode,
    session: response.Session
  };
}

export async function completeTotpSetup(input: { email: string; code: string; session: string }) {
  assertCognitoConfig();

  const verified = await client.send(
    new VerifySoftwareTokenCommand({
      Session: input.session,
      UserCode: input.code,
      FriendlyDeviceName: "Pestimator authenticator"
    })
  );

  if (verified.Status !== "SUCCESS" || !verified.Session) {
    throw new Error("Authenticator code could not be verified");
  }

  const response = await client.send(
    new RespondToAuthChallengeCommand({
      ChallengeName: "MFA_SETUP",
      ClientId: env.COGNITO_CLIENT_ID,
      Session: verified.Session,
      ChallengeResponses: {
        USERNAME: input.email
      }
    })
  );

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

  if (input.challengeName === "MFA_SETUP") {
    return completeTotpSetup({
      email: input.email,
      code: input.code,
      session: input.session
    });
  }

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
