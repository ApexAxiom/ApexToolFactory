import { RoleName } from "@/domain/types";

export interface SessionMembership {
  organizationId: string;
  role: RoleName;
}

export interface PestimatorSession {
  userId: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  memberships: SessionMembership[];
}
