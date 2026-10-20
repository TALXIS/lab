// The generated services type a create/update record as the table's model: option set values as the
// label keys, and no "<lookup>@odata.bind" entries. Dataverse takes numeric option set values and
// those bind strings, so the records built here follow Dataverse's rules instead. This is the one
// place that says so: it hands such a record to a service call without weakening types elsewhere.
export function servicePayload(record: Record<string, unknown>): never {
  return record as never;
}
