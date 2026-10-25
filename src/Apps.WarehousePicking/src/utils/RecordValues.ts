// A Dataverse number or option set value as a grid cell or form value: the generated models carry
// numbers as strings, and an empty one stays empty (Number(null) would show it as 0).
export function toNumber(value: string | number | null | undefined): number | null {
  return value == null || value === "" ? null : Number(value);
}

