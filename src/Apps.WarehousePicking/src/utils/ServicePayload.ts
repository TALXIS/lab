import type { IOperationResult } from "@microsoft/power-apps/data";

// The generated services type a create/update record as the table's model: option set values as the
// label keys, and no "<lookup>@odata.bind" entries. Dataverse takes numeric option set values and
// those bind strings, so the records built here follow Dataverse's rules instead. This is the one
// place that says so: it hands such a record to a service call without weakening types elsewhere.
export function servicePayload(record: Record<string, unknown>): never {
  return record as never;
}

// The generated services resolve { success: false, error } instead of throwing, so a call the server
// refused - a plugin's validation (an over-pick), a missing privilege - would read as done and show a
// success toast. Every service call goes through this: it passes the result on, or throws the server's
// message for the caller's error handling.
export async function serviceResult<T>(call: Promise<IOperationResult<T>>): Promise<IOperationResult<T>> {
  const result = await call;
  if (!result.success) {
    throw new Error(serverMessage(result.error?.message));
  }
  return result;
}

// Dataverse's error arrives as the response body, {"error":{"code":..,"message":..}} with the plugin trace
// alongside: keep just its message, e.g. "Not enough product in stock. Available: 7, requested: 8."
function serverMessage(text: string | undefined): string {
  if (!text) return "The request failed";
  try {
    return (JSON.parse(text) as { error?: { message?: string } }).error?.message || text;
  } catch {
    return text;
  }
}

