import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from './useRegister';

const schema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function useRegisterForm() {
  const { register, isPending, error, isSuccess, reset: resetMutation } = useRegister();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(data: FormData) {
    try {
      await register({ name: data.name, email: data.email, password: data.password });
    } catch {
    }
  }

  return {
    control,
    handleSubmit,
    getValues,
    errors,
    isPending,
    error,
    isSuccess,
    reset: resetMutation,
    onSubmit,
  };
}
