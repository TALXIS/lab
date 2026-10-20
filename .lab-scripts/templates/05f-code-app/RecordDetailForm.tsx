import { useMemo, useReducer, useState, type ReactNode } from "react";
import { CommandBar } from "@fluentui/react";
import { Body1, Tab, TabList, Title3, mergeClasses } from "@fluentui/react-components";
import { Form, useEventEmitter, useForm } from "@talxis/base-controls";
import { RecordForm } from "@/components/RecordForm";
import { RecordFormFields, type FormField, type LookupRecord } from "@/components/RecordFormFields";
import { getEntity } from "@/providers/pcf-host";
import { useStyles } from "@/styles/RecordDetailForm.styles";

/** A tab after the General one; its content can be anything, e.g. a grid of the record's children. */
type DetailTab = { id: string; label: string; content: ReactNode };

type RecordDetailFormProps = {
  /** The table the record belongs to (registered in entities.ts). */
  entityName: string;
  /** The record being shown; keep it stable (memoize it): a new object reloads the form. */
  record: { id: string; values: Record<string, unknown> };
  /** Keep this array stable (define it at module level): the form is built from it. */
  fields: FormField[];
  lookupRecords?: Record<string, LookupRecord[]>;
  /** Columns the General tab's fields are spread over. */
  columnCount?: number;
  /** The record's name, shown as the header's title. */
  title: string;
  /** Adds a Back button at the start of the ribbon. */
  onBack?: () => void;
  /** Extra content on the right of the header, e.g. a record-level action. */
  headerExtras?: ReactNode;
  /** Saves the changed fields; throw to keep the edits (the caller reports the failure). */
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
  tabs?: DetailTab[];
};

// An editable detail form for one record, laid out like a model-driven form: a ribbon on top (Back,
// Save, Reset), a header card with the record's title, its saved/unsaved state and the tab strip,
// and the active tab's content below. The fields are validated by their columns on Save (see
// RecordForm). Once the caller has saved and handed in the refreshed record, the form reloads.
export function RecordDetailForm({
  entityName,
  record,
  fields,
  lookupRecords,
  columnCount,
  title,
  onBack,
  headerExtras,
  onSave,
  tabs = [],
}: RecordDetailFormProps) {
  const styles = useStyles();
  const columns = useMemo(() => fields.map((field) => field.column), [fields]);
  // Held out here, not in the form, so the tab survives the form reloading after a save
  const [activeTab, setActiveTab] = useState("general");

  // Each tab is a Form.Tab around a Form.Column: the General tab holds the fields (as a labelled
  // section), the others a Section with one Cell around whatever the caller passed
  const allTabs = [
    {
      id: "general",
      label: "General",
      content: (
        <RecordFormFields
          fields={fields}
          lookupRecords={lookupRecords}
          columnCount={columnCount}
          sectionLabel="General"
        />
      ),
    },
    ...tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      content: (
        <Form.Section showLabel={false} showBar={false}>
          <Form.Column>
            <Form.Cell label="">{tab.content}</Form.Cell>
          </Form.Column>
        </Form.Section>
      ),
    })),
  ];
  const current = allTabs.find((tab) => tab.id === activeTab) ?? allTabs[0];

  return (
    <RecordForm entityName={entityName} columns={columns} record={record} onSave={onSave}>
      <div className={styles.root}>
        <div className={styles.ribbon}>
          <FormRibbon onBack={onBack} />
        </div>
        <div className={styles.detail}>
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.titleBlock}>
                <div className={styles.titleRow}>
                  <Title3 as="h1">{title}</Title3>
                  <SaveStatus />
                </div>
                <Body1 className={styles.subtitle}>{getEntity(entityName)?.displayName}</Body1>
              </div>
              {headerExtras && <div className={styles.extras}>{headerExtras}</div>}
            </div>
            <TabList selectedValue={current.id} onTabSelect={(_, data) => setActiveTab(String(data.value))}>
              {allTabs.map((tab) => (
                <Tab key={tab.id} value={tab.id} data-id={`tab-header-${tab.id}`}>
                  {tab.label}
                </Tab>
              ))}
            </TabList>
          </div>
          <div className={styles.body}>
            <Form.Tab key={current.id} id={current.id} label={current.label}>
              <Form.Column>{current.content}</Form.Column>
            </Form.Tab>
          </div>
        </div>
      </div>
      {/* The ribbon's Save only reacts to the mouse; this makes Enter inside a field save too */}
      <button type="submit" hidden tabIndex={-1} aria-hidden />
    </RecordForm>
  );
}

// "- Saved" / "- Unsaved changes" next to the title, following the form's dirty state
function SaveStatus() {
  const styles = useStyles();
  const form = useForm();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEventEmitter(form.events, ["onDirtyStateChanged", "onAfterSave"], rerender);

  const dirty = form.isDirty();
  return (
    <Body1 className={mergeClasses(styles.status, dirty && styles.statusUnsaved)}>
      {dirty ? "- Unsaved changes" : "- Saved"}
    </Body1>
  );
}

// Form.Ribbon brings Save (with its Saving/Saved states); Back and Reset are put around it in its
// command bar. Its own "Unsaved changes" marker is dropped: the header shows the state. Save is never
// disabled for "nothing changed": the text controls only report on blur, so a button that waits for
// the form to turn dirty couldn't be clicked straight after typing. Saving an unchanged form has
// nothing to send.
function FormRibbon({ onBack }: { onBack?: () => void }) {
  const form = useForm();

  const backItems = onBack
    ? [{ key: "back", ariaLabel: "Back", title: "Back", iconProps: { iconName: "Back" }, onClick: onBack }]
    : [];
  const resetItem = { key: "reset", text: "Reset", iconProps: { iconName: "Undo" }, onClick: () => form.refresh() };

  return (
    <Form.Ribbon
      components={{
        onRenderCommandBar: (props) => (
          <CommandBar {...props} items={[...backItems, ...(props.items ?? []), resetItem]} farItems={[]} />
        ),
      }}
    />
  );
}
