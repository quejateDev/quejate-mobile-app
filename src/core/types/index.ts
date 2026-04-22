// =============================================================================
// Enums
// =============================================================================

export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'CLIENT' | 'EMPLOYEE' | 'LAWYER';

export type PQRSType = 'PETITION' | 'COMPLAINT' | 'CLAIM' | 'SUGGESTION' | 'REPORT';

export type PQRSStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type DocumentType = 'CC' | 'CE' | 'PPT' | 'NIT' | 'PASSPORT' | 'LICENSE';

export type LawyerRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export type SuggestionStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'IMPLEMENTED';

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'lawyer_request_accepted'
  | 'lawyer_request_rejected'
  | 'new_lawyer_request'
  | 'pqrsd_time_expired';

// =============================================================================
// Auth
// =============================================================================

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  isOAuth: boolean;
}

// =============================================================================
// Location
// =============================================================================

export interface Municipality {
  id: string;
  name: string;
}

export interface RegionalDepartment {
  id: string;
  name: string;
  municipalities?: Municipality[];
}

// =============================================================================
// Category
// =============================================================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Entity
// =============================================================================

export interface Entity {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  email?: string;
  categoryId: string;
  municipalityId?: string;
  regionalDepartmentId?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: Category;
  municipality?: string;
  department?: string;
  pqrConfig?: PQRConfig;
  departments?: Department[];
  _count?: { pqrs: number };
}

// =============================================================================
// Department (Área de una entidad)
// =============================================================================

export interface Department {
  id: string;
  name: string;
  description?: string;
  email: string;
  entityId: string;
  createdAt: Date;
  updatedAt: Date;
  entity?: Entity;
  pqrConfig?: PQRConfig;
}

// =============================================================================
// PQR Config & Custom Fields
// =============================================================================

export interface CustomField {
  id: string;
  name: string;
  type: string;
  placeholder?: string;
  required: boolean;
  isForAnonymous: boolean;
}

export interface CustomFieldValue {
  name: string;
  value: string;
}

export interface PQRConfig {
  id: string;
  allowAnonymous: boolean;
  requireEvidence: boolean;
  maxResponseTime: number;
  notifyEmail: boolean;
  autoAssign: boolean;
  departmentId?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
  customFields: CustomField[];
}

// =============================================================================
// Attachment
// =============================================================================

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  pqrId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// User
// =============================================================================

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  isOAuth?: boolean;
  departmentId?: string;
  entityId?: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { followers: number; following: number; PQRS: number };
}

export interface UserProfile extends User {
  followers: Array<{ id: string; name: string }>;
  following: Array<{ id: string; name: string }>;
  isFollowing: boolean;
}

// =============================================================================
// Comment & Like
// =============================================================================

export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  pqrId: string;
  user: { id: string; name: string; image?: string };
}

export interface Like {
  id: string;
  userId: string;
}

// =============================================================================
// PQRS
// =============================================================================

export interface PQRS {
  id: string;
  type: PQRSType;
  status: PQRSStatus;
  dueDate: Date;
  anonymous: boolean;
  private: boolean;
  subject?: string;
  description?: string;
  consecutiveCode?: string;
  creatorId?: string;
  assignedToId?: string;
  departmentId?: string;
  entityId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  entity: { id: string; name: string; description?: string; email?: string; imageUrl?: string };
  department: { id: string; name: string; description?: string; email: string; entityId: string } | null;
  creator?: { id: string; name: string; image?: string } | null;
  attachments: Attachment[];
  comments: Comment[];
  likes: Like[];
  customFieldValues: CustomFieldValue[];
  _count?: { likes: number; comments: number };
}

// =============================================================================
// Notification
// =============================================================================

export type NotificationData = Record<string, unknown>;

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: NotificationData;
}

// =============================================================================
// Lawyer
// =============================================================================

export interface Lawyer {
  id: string;
  userId: string;
  documentType: DocumentType;
  identityDocument: string;
  identityDocumentImage: string;
  professionalCardImage: string;
  licenseNumber: string;
  specialties: string[];
  description?: string;
  feePerHour?: number;
  feePerService?: number;
  isVerified: boolean;
  averageRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; image?: string; email: string; phone?: string };
}

export interface LawyerRequest {
  id: string;
  userId: string;
  lawyerId: string;
  pqrId?: string;
  message: string;
  serviceType?: string;
  status: LawyerRequestStatus;
  clientContactEmail?: string;
  clientContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rating {
  id: string;
  lawyerId: string;
  clientId: string;
  score: number;
  comment?: string;
  createdAt: Date;
}

// =============================================================================
// OversightEntity
// =============================================================================

export interface OversightEntity {
  id: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  municipalityId?: string;
  regionalDepartmentId?: string;
  Municipality?: { id: string; name: string };
  RegionalDepartment?: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Paginated responses
// =============================================================================

/** Respuesta paginada estilo PQR list - hasMore + nextPage */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextPage: number | null;
}

/** Respuesta paginada estilo Lawyers / Ratings - objeto pagination */
export interface PaginatedResponseAlt<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// API Error
// =============================================================================

export interface ApiError {
  error: string;
  details?: unknown;
}

// =============================================================================
// UI Constants
// =============================================================================

export const typeMap: Record<PQRSType, { label: string; color: string }> = {
  PETITION:   { label: 'Petición',   color: '#2563EB' },
  COMPLAINT:  { label: 'Queja',      color: '#DC2626' },
  CLAIM:      { label: 'Reclamo',    color: '#92400E' },
  SUGGESTION: { label: 'Sugerencia', color: '#16A34A' },
  REPORT:     { label: 'Denuncia',   color: '#CA8A04' },
};

export const statusMap: Record<PQRSStatus, { label: string }> = {
  PENDING:     { label: 'Pendiente'  },
  IN_PROGRESS: { label: 'En Proceso' },
  RESOLVED:    { label: 'Resuelto'   },
  CLOSED:      { label: 'Cerrado'    },
};

export const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
export const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm'];
