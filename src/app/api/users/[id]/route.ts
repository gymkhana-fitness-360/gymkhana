import { createApiHandler } from "@/lib/api-handler";
import {
  deleteUserForAccount,
  getUserForAccount,
  logUserRouteError,
  updateUserBodySchema,
  updateUserForAccount,
} from "@/domains/platform/users/handlers/user-crud";
import { ApiErrors } from "@/lib/api-handler";

export const GET = createApiHandler(
  async (request, { session, params }) => {
    try {
      return await getUserForAccount(session, request, params.id);
    } catch (error) {
      logUserRouteError("fetching user", error);
      return ApiErrors.internal("Failed to fetch user");
    }
  },
  { rateLimit: "lenient", adminOnly: true },
);

export const PUT = createApiHandler(
  async (request, { session, params, body }) => {
    try {
      const parsed = updateUserBodySchema.parse(body);
      return await updateUserForAccount(session, request, params.id, parsed);
    } catch (error) {
      logUserRouteError("updating user", error);
      return ApiErrors.internal("Failed to update user");
    }
  },
  { rateLimit: "strict", adminOnly: true },
);

export const DELETE = createApiHandler(
  async (request, { session, params }) => {
    try {
      return await deleteUserForAccount(session, request, params.id);
    } catch (error) {
      logUserRouteError("deleting user", error);
      return ApiErrors.internal("Failed to delete user");
    }
  },
  { rateLimit: "strict", adminOnly: true },
);
