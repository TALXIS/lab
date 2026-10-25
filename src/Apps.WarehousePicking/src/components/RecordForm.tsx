import { useEffect, useMemo, useRef, type FormEvent, type ReactNode } from "react";
import { Form, useForm, type IFormStrategy } from "@talxis/base-controls";
import type { IColumn } from "@talxis/client-libraries";
import { getEntity } from "@/providers/pcf-host";

type RecordFormProps = {
  /** A table registered in entities.ts; its primary columns identify the record. */
  entityName: string;
  /** Columns carry the validation: requiredLevel, metadata MinValue/MaxValue/MaxLength. */
  columns: IColumn[];
  /** An existing record to edit; without it the form starts empty, for a new record. Keep it stable
   *  (memoize it): a new object reloads the form with the new values. */
  record?: { id: string; values: Record<string, unknown> };
  /** Starting values for a new record's fields. Unlike `record`, they count as entered by the user, so
   *  they are sent on save. Applied once each time the form loads. */
  defaults?: Record<string, unknown>;
  /** Saves the changed field values (all filled ones on a new record); throw to signal a failed save. */
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
  /** Runs after a successful save. */
  onSaved?: () => void;
  /** The form's layout (Form.Section/Column/Field/Cell/Control) and its buttons. */
  children: ReactNode;
};

// A TALXIS base-controls Form over one in-memory record (new, or loaded from `record`): Form builds a
// MemoryDataProvider record, binds each Form.Control to its field and validates the columns' rules
// (required, ranges, number parsing) when saving. The strategy only decides where a valid record
// goes: onSave, which gets the changed fields (on a new record that is every filled one).
export function RecordForm({ entityName, columns, record, defaults, onSave, onSaved, children }: RecordFormProps) {
  const entity = getEntity(entityName);
  if (!entity) throw new Error(`RecordForm: '${entityName}' isn't registered in entities.ts`);

  // The strategy is built once per form; it must still call the latest onSave
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const strategy = useMemo<IFormStrategy>(
    () => ({
      onLoad: async () => ({
        columns,
        // The memory record needs an id; it isn't dirty, so it never reaches onSave
        data: { ...record?.values, [entity.primaryIdAttribute]: record?.id ?? crypto.randomUUID() },
        metadata: {
          PrimaryIdAttribute: entity.primaryIdAttribute,
          PrimaryNameAttribute: entity.primaryNameAttribute,
        },
      }),
      onSave: async ({ recordId, updatedData }) => {
        try {
          await onSaveRef.current(updatedData);
          return { recordId, success: true, fields: [] };
        } catch {
          // The caller reports the failure (toast); the form just keeps its values
          return { recordId, success: false, fields: [] };
        }
      },
    }),
    [entity, columns, record]
  );

  return (
    <Form.Root strategy={strategy} onAfterSave={({ success }) => success && onSaved?.()}>
      <FormBody defaults={defaults}>{children}</FormBody>
    </Form.Root>
  );
}

// Enter submits like a native form; everything goes through the form's own save (validation first).
function FormBody({ children, defaults }: { children: ReactNode; defaults?: Record<string, unknown> }) {
  const form = useForm();

  // Entered through the fields, not loaded with the record, so they are dirty and saved
  useEffect(() => {
    for (const [name, value] of Object.entries(defaults ?? {})) {
      if (value !== undefined && value !== "") form.getField(name).setValue(value);
    }
    // once per load: this component is remounted whenever the form reloads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // The text controls only report their value on blur and Enter doesn't blur: commit the field
    // being typed in, give the form a tick to take the value, then save
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTimeout(() => void form.save(), 0);
  };

  return <form onSubmit={onSubmit}>{children}</form>;
}

