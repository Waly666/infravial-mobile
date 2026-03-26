export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  /** Sin `id` = alta; con `id` = edición (como `SenVertWizard`). */
  ViaTramoWizard:
    | { id?: string; draftLocalId?: string; draftPayload?: Record<string, unknown> }
    | undefined;
  /** ExistSenVert: sin `id` = alta; con `id` = edición. */
  SenVertWizard: { id?: string } | undefined;
  /** ExistSenHor: sin `id` = alta; con `id` = edición. */
  SenHorWizard: { id?: string } | undefined;
  CajaInspWizard:
    | { id?: string; draftLocalId?: string; draftPayload?: Record<string, unknown> }
    | undefined;
  ControlSemWizard:
    | { id?: string; draftLocalId?: string; draftPayload?: Record<string, unknown> }
    | undefined;
  SemaforoWizard:
    | { id?: string; draftLocalId?: string; draftPayload?: Record<string, unknown> }
    | undefined;
};
