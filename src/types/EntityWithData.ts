export interface EntityWithData<T extends Record<string, unknown>>
  extends Entity {
  GetData: () => T;
}
