import { createNavigationContainerRef } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AppTabParamList = {
  PQRSDs: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  CreatePQR: undefined;
  PQRDetail: { id: string };
  MyPQRs: undefined;
  PublicProfile: { userId: string };
};

export const navigationRef = createNavigationContainerRef<AppStackParamList>();
