/**
 * Test users and admin accounts that should be excluded from member counts and analytics
 */

export const TEST_USER_NAMES: string[] = [
  "Debjani Chatterjee",
  "Ankit Das",
];

/**
 * Prisma where clause to exclude test users from member queries
 */
export const excludeTestUsers = {
  NOT: {
    name: {
      in: TEST_USER_NAMES,
    },
  },
};

/**
 * Check if a member name is a test user
 */
export function isTestUser(name: string): boolean {
  return TEST_USER_NAMES.some(
    (testName) => name.toLowerCase() === testName.toLowerCase()
  );
}
