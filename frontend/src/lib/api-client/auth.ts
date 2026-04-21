import { apiRequest, type ApiResult } from "@/lib/api-client/core";

export type SessionUser = {
  id: number;
};

export async function getAuthSession(): Promise<ApiResult<SessionUser>> {
  return apiRequest<SessionUser>("/api/auth/session");
}
