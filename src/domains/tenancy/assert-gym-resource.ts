/**
 * Post-fetch tenant guard for resources loaded by id.
 */
export function resourceBelongsToGym(
  resource: { gymId: string } | null | undefined,
  gymId: string,
): boolean {
  return !!resource && resource.gymId === gymId;
}

export function assertResourceBelongsToGym(
  resource: { gymId: string } | null | undefined,
  gymId: string,
): asserts resource is { gymId: string } {
  if (!resourceBelongsToGym(resource, gymId)) {
    throw new Error("RESOURCE_NOT_IN_GYM");
  }
}
