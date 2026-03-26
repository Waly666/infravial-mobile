export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  /** Sin `id` = alta; con `id` = edición (como `SenVertWizard`). */
  ViaTramoWizard: { id?: string } | undefined;
  /** ExistSenVert: sin `id` = alta; con `id` = edición. */
  SenVertWizard: { id?: string } | undefined;
};
