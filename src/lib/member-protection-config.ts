/**
 * OSS installs disable tenant-specific member protection rules unless explicitly enabled.
 */
export function isMemberProtectionEnabled(): boolean {
  return process.env.MEMBER_PROTECTION_ENABLED === "true";
}
