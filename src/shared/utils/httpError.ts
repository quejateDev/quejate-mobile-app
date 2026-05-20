export function getErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response
    ?.status;
}

export function isUnauthorized(error: unknown): boolean {
  return getErrorStatus(error) === 401;
}
