export const ENDPOINTS = {
  AUTH: {
    CSRF:          '/auth/csrf',
    SESSION:       '/auth/session',
    SIGNIN:        '/auth/callback/credentials',
    SIGNOUT:       '/auth/signout',
    REGISTER:      '/register',
    MOBILE_GOOGLE: '/auth/mobile/google',
    MOBILE_CREDENTIALS: '/auth/mobile/credentials',
    MOBILE_SESSION: '/auth/mobile/session',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD:  '/auth/reset-password',
  },
  PQR: {
    LIST:     '/pqr',
    CREATE:   '/pqr',
    TOP:      '/pqr/top',
    /**
     * Proyección ligera para el mapa: array pelado (sin envoltorio `{ pqrs }`),
     * hasta 1000 puntos y solo PQRSD públicas con coordenadas. El anonimato lo
     * aplica el servidor: en las anónimas `creator` y `creatorId` llegan en null.
     */
    MAP:      '/pqr/map',
    DETAIL:   (id: string) => `/pqr/${id}`,
    BY_USER:  (id: string) => `/pqr/user/${id}`,
    STATUS:   (id: string) => `/pqr/${id}/status`,
    PRIVACY:  (id: string) => `/pqr/${id}/privacy`,
    COMMENTS: (id: string) => `/pqr/${id}/comments`,
    LIKE:     (id: string) => `/pqr/${id}/like`,
    /**
     * GET: `application/pdf` con el certificado de radicación. Solo el autor;
     * a cualquier otro le responde 404, igual que si la PQRSD no existiera.
     */
    CERTIFICATE: (id: string) => `/pqr/${id}/certificate.pdf`,
  },
  ENTITIES: {
    LIST:   '/entities',
    DETAIL: (id: string) => `/entities/${id}`,
  },
  AREAS: {
    LIST:       '/area',
    DETAIL:     (id: string) => `/area/${id}`,
    PQR_CONFIG: (id: string) => `/area/${id}/pqr-config`,
  },
  LOCATIONS: {
    DEPARTMENTS:    '/regional-departments',
    MUNICIPALITIES: '/municipalities',
  },
  UPLOAD: {
    DIRECT:    '/upload',
    PRESIGNED: '/upload/presigned',
  },
  NOTIFICATIONS: {
    LIST:       '/notifications',
    MARK_READ:  '/notifications',
    DELETE:     (id: string) => `/notifications/${id}`,
    DELETE_ALL: '/notifications',
  },
  PUSH_TOKEN: '/push-token',
  USERS: {
    LIST:            '/users',
    SEARCH:          '/users/search',
    DETAIL:          (id: string) => `/users/${id}`,
    UPDATE:          (id: string) => `/users/${id}`,
    DELETE:          (id: string) => `/users/${id}`,
    FOLLOW:          (id: string) => `/users/${id}/follow`,
    FAVORITES:       (id: string) => `/users/${id}/favorite-entities`,
  },
  LAWYERS: {
    LIST:          '/lawyer',
    REGISTER:      '/lawyer/register',
    DETAIL:        (id: string) => `/lawyer/${id}`,
    PROFILE:       '/lawyer/profile',
    VALIDATE:      '/lawyer/validate',
    REQUEST:       '/lawyer/request',
    MY_REQUESTS:   '/lawyer/my-requests',
    RATING:        '/lawyer/rating',
    MY_RATING:     '/lawyer/rating/my-rating',
    RATING_UPDATE: '/lawyer/rating/update',
    VERIFICATION:  '/lawyer-verification',
  },
  OVERSIGHT: {
    LIST:          '/oversight-entity',
    BY_LOCATION:   '/oversight-entity/by-location',
    SEND_DOCUMENT: '/oversight/send-document',
  },
  LEGAL_DOCS: {
    /** POST: genera el documento. Responde `{ tutela, id? }` — el `id` es aditivo. */
    TUTELA: '/legal-docs',
    /** GET: documentos del usuario. Cada fila viene SIN el texto. */
    LIST:   '/legal-docs',
    /** GET: la fila de la lista más `content`. */
    DETAIL: (id: string) => `/legal-docs/${id}`,
    /** GET: `application/pdf`. No pasa por apiClient, ver legalDocShare.ts. */
    PDF:    (id: string) => `/legal-docs/${id}/pdf`,
  },
  CATEGORIES: {
    LIST:   '/category',
    DETAIL: (id: string) => `/category/${id}`,
  },
} as const;
