/**
 * Utility functions to trigger sidebar count updates
 * Call these after successful mutations to update sidebar badges in real-time
 */

export function triggerMemberUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("member-updated"));
  }
}

export function triggerPaymentUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("payment-updated"));
  }
}

export function triggerOverdueUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("overdue-updated"));
  }
}

/**
 * Trigger all sidebar updates at once
 * Use this when an action affects multiple counts
 */
export function triggerAllSidebarUpdates() {
  triggerMemberUpdate();
  triggerPaymentUpdate();
  triggerOverdueUpdate();
}
