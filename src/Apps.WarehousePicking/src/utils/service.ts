import type { IOperationResult } from "@microsoft/power-apps/data"

export const TRANSACTION_TYPE = { Inbound: 100000000, Outbound: 100000001 } as const
export type TransactionType = keyof typeof TRANSACTION_TYPE

export const CATEGORY = { Electronics: 100000000, Clothing: 100000001, Food: 100000002, Hardware: 100000003, Other: 100000004 } as const

// The generated models type numbers as strings, choices as label keys and omit some @odata.bind keys;
// Dataverse wants numeric choice values and bind strings, so payloads are built here and passed as-is.
export function payload(record: Record<string, unknown>): never {
  return record as never
}

// Services resolve { success: false } instead of throwing: surface the server's own message.
export async function unwrap<T>(call: Promise<IOperationResult<T>>): Promise<T> {
  const result = await call
  if (!result.success) throw new Error(serverMessage(result.error?.message))
  return result.data
}

function serverMessage(text: string | undefined): string {
  if (!text) return "The request failed"
  try {
    return (JSON.parse(text) as { error?: { message?: string } }).error?.message || text
  } catch {
    return text
  }
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
