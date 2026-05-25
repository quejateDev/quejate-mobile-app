import { createNavigationContainerRef } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AppTabParamList = {
  Inicio: undefined;
  MisPQRSDs: undefined;
  Entidades: undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  CreatePQR:
    | {
        entityId?: string;
        entityNameHint?: string;
        categoryHint?: string;
        categoryId?: string;
      }
    | undefined;
  PQRDetail: { id: string };
  Notificaciones: undefined;
  PublicProfile: { userId: string };
  FormalFollowup: { pqrId: string };
  GenerateTutela: { pqrId: string };
  LawyerList: { pqrId?: string } | undefined;
  LawyerDetail: { lawyerId: string; pqrId?: string };
  MyLawyerRequests: undefined;
  RegisterAsLawyer: undefined;
  MapaCiudadano: undefined;
  Debug: undefined;
};

export const navigationRef = createNavigationContainerRef<AppStackParamList>();
