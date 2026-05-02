import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { uploadToS3 } from '@shared/utils/s3Upload';
import type { DocumentType, Lawyer, LawyerRequest, Rating } from '@core/types';

export interface RegisterLawyerInput {
  documentType: DocumentType;
  identityDocument: string;
  identityDocumentImageUri: string;
  professionalCardImageUri: string;
  licenseNumber: string;
  specialties: string[];
  description?: string;
  feePerHour?: number;
  feePerService?: number;
}

export type LawyerRequestWithLawyer = LawyerRequest & {
  lawyer?: { user: { name: string; image?: string } };
};

interface RatingsResponse {
  data: Rating[];
  averageScore: number;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export function useLawyers() {
  return useQuery<Lawyer[]>({
    queryKey: ['lawyers'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.LAWYERS.LIST);
      const d = res.data as Lawyer[] | { data: Lawyer[] };
      return Array.isArray(d) ? d : d.data;
    },
  });
}

export function useLawyerDetail(id: string) {
  return useQuery<Lawyer>({
    queryKey: ['lawyer', id],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.LAWYERS.DETAIL(id));
      return res.data as Lawyer;
    },
    enabled: !!id,
  });
}

export function useMyLawyerRequests() {
  return useQuery<LawyerRequestWithLawyer[]>({
    queryKey: ['my-lawyer-requests'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.LAWYERS.MY_REQUESTS, {
        params: { page: 1, limit: 50 },
      });
      const d = res.data as LawyerRequestWithLawyer[] | { data: LawyerRequestWithLawyer[] };
      return Array.isArray(d) ? d : d.data;
    },
  });
}

export function useCreateLawyerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      lawyerId: string;
      message: string;
      pqrId?: string;
      clientContactEmail?: string;
      clientContactPhone?: string;
    }) => apiClient.post(ENDPOINTS.LAWYERS.REQUEST, body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lawyer-requests'] });
    },
  });
}

export function useLawyerRatings(lawyerId: string) {
  return useQuery<RatingsResponse>({
    queryKey: ['lawyer', lawyerId, 'ratings'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.LAWYERS.RATING, {
        params: { lawyerId, page: 1, limit: 10 },
      });
      return res.data as RatingsResponse;
    },
    enabled: !!lawyerId,
  });
}

export function useMyRating(lawyerUserId: string) {
  return useQuery<{ rating: Rating | null }>({
    queryKey: ['my-lawyer-rating', lawyerUserId],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.LAWYERS.MY_RATING, {
        params: { lawyerId: lawyerUserId },
      });
      return res.data as { rating: Rating | null };
    },
    enabled: !!lawyerUserId,
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { lawyerId: string; lawyerUserId: string; score: number; comment?: string }) =>
      apiClient.post(ENDPOINTS.LAWYERS.RATING, {
        lawyerId: body.lawyerUserId,
        score: body.score,
        comment: body.comment,
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lawyer', vars.lawyerId, 'ratings'] });
      queryClient.invalidateQueries({ queryKey: ['my-lawyer-rating', vars.lawyerUserId] });
      queryClient.invalidateQueries({ queryKey: ['lawyer', vars.lawyerId] });
    },
  });
}

export function useRegisterAsLawyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterLawyerInput) => {
      const [identityDocumentImage, professionalCardImage] = await Promise.all([
        uploadToS3(input.identityDocumentImageUri, 'image/jpeg', 'lawyers'),
        uploadToS3(input.professionalCardImageUri, 'image/jpeg', 'lawyers'),
      ]);
      const res = await apiClient.post(ENDPOINTS.LAWYERS.REGISTER, {
        documentType: input.documentType,
        identityDocument: input.identityDocument,
        identityDocumentImage,
        professionalCardImage,
        licenseNumber: input.licenseNumber,
        specialties: input.specialties,
        description: input.description,
        feePerHour: input.feePerHour,
        feePerService: input.feePerService,
      });
      return res.data as Lawyer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyers'] });
    },
  });
}

export function useUpdateRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ratingId: string; lawyerId: string; lawyerUserId: string; score: number; comment?: string }) =>
      apiClient.put(ENDPOINTS.LAWYERS.RATING_UPDATE, {
        ratingId: body.ratingId,
        score: body.score,
        comment: body.comment,
      }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lawyer', vars.lawyerId, 'ratings'] });
      queryClient.invalidateQueries({ queryKey: ['my-lawyer-rating', vars.lawyerUserId] });
      queryClient.invalidateQueries({ queryKey: ['lawyer', vars.lawyerId] });
    },
  });
}
