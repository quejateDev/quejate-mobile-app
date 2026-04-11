import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: string;
}

function mapRegisterError(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Sin conexión. Verifica tu internet';
  }
  if (
    error &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const status = (error as { response: { status: number } }).response?.status;
    if (status === 409) return 'Este correo ya tiene una cuenta registrada';
    if (status === 400) return 'Verifica los datos ingresados';
  }
  return 'Error al crear la cuenta. Intenta de nuevo';
}

export function useRegister() {
  const mutation = useMutation<RegisterResponse, unknown, RegisterInput>({
    mutationFn: (data) =>
      apiClient
        .post<RegisterResponse>(ENDPOINTS.AUTH.REGISTER, data)
        .then((res) => res.data),
  });

  return {
    register: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? mapRegisterError(mutation.error) : null,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
