import { createVerify } from "crypto";

export interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
}

const signedFieldsByType: Record<string, string[]> = {
  Notification: ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"],
  SubscriptionConfirmation: ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"],
  UnsubscribeConfirmation: ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"]
};

const certCache = new Map<string, string>();

export function assertValidSnsUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) {
    throw new Error("URL does not point to Amazon SNS");
  }
  return url;
}

export async function verifySnsMessage(message: SnsMessage) {
  const fields = signedFieldsByType[message.Type];
  if (!fields) {
    throw new Error(`Unsupported SNS message type: ${message.Type}`);
  }

  const record = message as unknown as Record<string, string | undefined>;
  const canonical = fields
    .filter((field) => record[field] !== undefined)
    .map((field) => `${field}\n${record[field]}\n`)
    .join("");

  const algorithm = message.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  const certificate = await fetchSigningCertificate(message.SigningCertURL);
  const verifier = createVerify(algorithm);
  verifier.update(canonical, "utf8");

  if (!verifier.verify(certificate, message.Signature, "base64")) {
    throw new Error("SNS message signature verification failed");
  }
}

async function fetchSigningCertificate(certUrl: string) {
  assertValidSnsUrl(certUrl);
  const cached = certCache.get(certUrl);
  if (cached) return cached;

  const response = await fetch(certUrl);
  if (!response.ok) {
    throw new Error("Could not download the SNS signing certificate");
  }

  const pem = await response.text();
  certCache.set(certUrl, pem);
  return pem;
}
