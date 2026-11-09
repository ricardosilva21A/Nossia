// Which sign-in screen an address means.

export type AuthMode = "sign-in" | "sign-up";

export type AuthFlow = AuthMode | "reset-request" | "password-update" | "join";

export type CoupleInvitePreview = { partner_one_name: string; partner_two_name: string };

export function inviteCodeFromPath(pathname: string) {
  return /^\/join\/([a-f0-9]{32})\/?$/.exec(pathname)?.[1] ?? null;
}

export const initialInviteCode = inviteCodeFromPath(window.location.pathname);

export const authPaths: Record<AuthFlow, string> = {
  "sign-in": "/signin",
  "sign-up": "/signup",
  "reset-request": "/recover",
  "password-update": "/update-password",
  join: initialInviteCode ? `/join/${initialInviteCode}` : "/signup",
};

export function authFlowFromPath(pathname: string): AuthFlow {
  if (pathname === "/recover") return "reset-request";
  if (pathname === "/signup" || pathname === "/register") return "sign-up";
  if (pathname === "/update-password") return "password-update";
  if (inviteCodeFromPath(pathname)) return "join";
  return "sign-in";
}
