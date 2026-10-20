export function getErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response
    ?.status;
}

/** El texto del cuerpo `{ error }` con que responde el servidor, si trae uno. */
export function getErrorText(error: unknown): string | undefined {
  const text = (error as { response?: { data?: { error?: unknown } } } | null | undefined)
    ?.response?.data?.error;
  return typeof text === 'string' && text.trim() !== '' ? text : undefined;
}

export function isUnauthorized(error: unknown): boolean {
  return getErrorStatus(error) === 401;
}
