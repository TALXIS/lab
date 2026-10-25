import { Form, useField } from "@talxis/base-controls";
import type { IColumn } from "@talxis/client-libraries";
import { RequiredLevelEnum } from "@talxis/client-metadata";
import { RecordLookup } from "@/components/RecordLookup";

export type FormField = {
  /** Carries the validation rules, e.g. metadata MinValue/MaxValue/MaxLength. */
  column: IColumn;
  required?: boolean;
  /** Shown but not editable (not supported on lookup fields). */
  disabled?: boolean;
  /** A lookup field: a SingleLine.Text column holding the picked record's id, searched over the
   *  records passed in `lookupRecords[column.name]`. Form's stock Lookup can't search in memory. */
  lookupEntity?: string;
  /** data-testid of the field's wrapper; defaults to "field-<column name without publisher prefix>". */
  testId?: string;
};

export type LookupRecord = { id: string; name: string };

type RecordFormFieldsProps = {
  /** Every field, in order; must sit inside a RecordForm. */
  fields: FormField[];
  lookupRecords?: Record<string, LookupRecord[]>;
  /** How many columns the fields are spread over (in order, top to bottom per column); 1 by default.
   *  The columns wrap at narrower widths: two on medium, one on small. */
  columnCount?: number;
  /** A title bar on the fields' section; none by default. */
  sectionLabel?: string;
};

// The labelled fields of a RecordForm: one Form.Field/Cell/Control per field, with a * on the
// required ones, lookups rendered through RecordLookup, and a test id on each field's wrapper.
export function RecordFormFields({ fields, lookupRecords = {}, columnCount = 1, sectionLabel }: RecordFormFieldsProps) {
  const perColumn = Math.ceil(fields.length / columnCount);
  const groups = Array.from({ length: columnCount }, (_, index) => fields.slice(index * perColumn, (index + 1) * perColumn));
  // Form.Section places its Form.Columns side by side, this many per row at each width
  const layout = { lg: columnCount, md: Math.min(columnCount, 2), sm: 1, xs: 1 };

  return (
    <Form.Section label={sectionLabel} showLabel={!!sectionLabel} showBar={!!sectionLabel} layout={layout}>
      {groups.map((group, index) => (
        <Form.Column key={index}>
          {group.map(({ column, required, disabled, lookupEntity, testId }) => {
            const level = required ? RequiredLevelEnum.ApplicationRequired : RequiredLevelEnum.None;
            return (
              <Form.Field key={column.name} name={column.name} requiredLevel={level}>
                {/* Explicit on the cell too, so the * shows before the first submit */}
                <Form.Cell requiredLevel={level}>
                  <div data-testid={testId ?? `field-${column.name.replace(/^[^_]+_/, "")}`}>
                    {lookupEntity ? (
                      <Form.Control
                        components={{
                          onRenderControl: () => (
                            <LookupFieldControl
                              entityName={lookupEntity}
                              records={lookupRecords[column.name] ?? []}
                              required={required}
                            />
                          ),
                        }}
                      />
                    ) : (
                      <Form.Control disabled={disabled} />
                    )}
                  </div>
                </Form.Cell>
              </Form.Field>
            );
          })}
        </Form.Column>
      ))}
    </Form.Section>
  );
}

// RecordLookup bound to the form field the surrounding Form.Field names
function LookupFieldControl({ entityName, records, required }: { entityName: string; records: LookupRecord[]; required?: boolean }) {
  const field = useField();
  return (
    <RecordLookup
      entityName={entityName}
      records={records}
      value={field?.getValue() ?? ""}
      onChange={(id) => field?.setValue(id || null)}
      inputId={field ? `${field.getColumn().name}-input` : undefined}
      required={required}
    />
  );
}

