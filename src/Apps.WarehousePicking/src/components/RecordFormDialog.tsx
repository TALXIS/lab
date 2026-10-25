import { useMemo } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { RecordForm } from "@/components/RecordForm";
import { RecordFormFields, type FormField, type LookupRecord } from "@/components/RecordFormFields";
import { useStyles } from "@/styles/RecordFormDialog.styles";

type RecordFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The table the new record is for (registered in entities.ts). */
  entityName: string;
  /** Keep this array stable (define it at module level): the form is built from it once. */
  fields: FormField[];
  lookupRecords?: Record<string, LookupRecord[]>;
  /** Starting values for the fields (see RecordForm's `defaults`). */
  defaults?: Record<string, unknown>;
  /** Creates the record; throw to keep the dialog open (the caller reports the failure). */
  onCreate: (values: Record<string, unknown>) => Promise<unknown>;
  pending?: boolean;
  /** For UI tests; every field also gets data-testid="field-<column name without publisher prefix>". */
  submitTestId?: string;
};

// A create dialog: Fluent Dialog around a base-controls Form (see RecordForm), laid out as a list
// of labelled fields. The fields' columns decide the validation; the Form applies it on submit and
// then live, and calls onCreate with the filled values.
export function RecordFormDialog({
  open,
  onOpenChange,
  title,
  entityName,
  fields,
  lookupRecords = {},
  defaults,
  onCreate,
  pending,
  submitTestId,
}: RecordFormDialogProps) {
  const styles = useStyles();
  const columns = useMemo(() => fields.map((field) => field.column), [fields]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        {/* The form renders a skeleton until it has loaded, with nothing focusable in it. Fluent
            moves focus into the dialog only if the surface holds a focusable element when it
            opens - without one, the page behind keeps the focus and fights the form for it. */}
        <DialogTrigger disableButtonEnhancement>
          <Button className={styles.close} appearance="subtle" aria-label="Close" icon={<DismissRegular />} />
        </DialogTrigger>
        <RecordForm
          entityName={entityName}
          columns={columns}
          defaults={defaults}
          onSave={onCreate}
          onSaved={() => onOpenChange(false)}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent className={styles.form}>
              <RecordFormFields fields={fields} lookupRecords={lookupRecords} />
            </DialogContent>
            <DialogActions>
              <Button type="button" appearance="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" disabled={pending} data-testid={submitTestId}>
                {pending ? "Creating..." : "Create"}
              </Button>
            </DialogActions>
          </DialogBody>
        </RecordForm>
      </DialogSurface>
    </Dialog>
  );
}

