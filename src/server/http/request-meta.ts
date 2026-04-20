export function getRequestIp(headers: Pick<Headers, "get">) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "0.0.0.0";
  }

  return headers.get("x-real-ip") || "0.0.0.0";
}

export function getUserAgent(headers: Pick<Headers, "get">) {
  return headers.get("user-agent") || undefined;
}
