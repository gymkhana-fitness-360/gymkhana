/**
 * Prisma seed entrypoint — used by `npm run db:seed` and `npx prisma db seed`.
 *
 * Delegates to the demo-tenant seed, which creates the default Account + Gym
 * and links any users that don't yet have an account. Importing the script runs
 * its self-executing `main()`.
 */
import "../scripts/seed-demo-gym";
