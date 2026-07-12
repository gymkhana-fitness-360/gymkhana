/**
 * Multi-tenant gym / account context.
 */

export interface GymContextDTO {
  id: string;
  name: string;
  slug: string | null;
  timezone: string;
}

export interface AccountContextDTO {
  accountId: string;
  gyms: GymContextDTO[];
}
