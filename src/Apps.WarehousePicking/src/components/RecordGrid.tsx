import { useCallback, useEffect, useRef, useState } from "react";
import { Grid, NestedControlRenderer, useEventEmitter, usePcfContext } from "@talxis/base-controls";
import {
  Dataset,
  DatasetConstants,
  MemoryDataProvider,
  type ICommand,
  type IColumn,
  type IRawRecord,
} from "@talxis/client-libraries";
import { RecordCards } from "@/components/RecordCards";
import { useIsPhone } from "@/hooks/UseIsPhone";
import { getEntity } from "@/providers/pcf-host";
import { useToast } from "@/hooks/use-toast";

type RecordGridProps = {
  /** Rows the page already loaded through the generated services; undefined while loading. */
  rows: IRawRecord[] | undefined;
  columns: IColumn[];
  /** A table registered in entities.ts; its primary columns key the rows. */
  entityName: string;
  /** Class put on every AG Grid row, e.g. as a stable hook for UI tests. */
  rowClassName?: string;
  /** Buttons for the grid's ribbon, ahead of Refresh (e.g. "New Item"). The ribbon is shown when
   *  this or onRefresh is given. */
  commands?: GridCommand[];
  /** What the ribbon's Refresh does: the rows come from the page, so it re-queries them. */
  onRefresh?: () => unknown;
};

type GridCommand = {
  id: string;
  label: string;
  /** A Fluent (v8) icon name, e.g. "Add". */
  icon: string;
  onExecute: () => unknown;
};

// A dataset command as the ribbon wants it
function toCommand({ id, label, icon, onExecute }: GridCommand): ICommand {
  return {
    commandId: id,
    commandButtonId: id,
    label,
    tooltip: label,
    icon,
    canExecute: true,
    shouldBeVisible: true,
    children: [],
    controlType: "",
    execute: async () => {
      await onExecute();
    },
  };
}

// A read-only TALXIS base-controls Grid over data the code app already has: a MemoryDataProvider
// holds the rows (there's no Dataverse Web API behind a code app's PCF context). Record names link
// to the entity's page when it has one, opened like any control would: context.navigation.openForm.
// With `commands`/`onRefresh` it carries the dataset ribbon on top, like a model-driven grid: the
// commands come from the dataset (its defaults plus ours, through the onRetrieveRecordCommand
// interceptor) and are shown by base controls' Ribbon control.
export function RecordGrid({ rows, columns, entityName, rowClassName, commands, onRefresh }: RecordGridProps) {
  const context = usePcfContext();
  const entity = getEntity(entityName);
  if (!entity) throw new Error(`RecordGrid: '${entityName}' isn't registered in entities.ts`);

  // The interceptor below is set once; it must still see the latest handlers
  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const showRibbon = !!commands || !!onRefresh;
  const isPhone = useIsPhone();

  // Opens a record like any control would; a failure (no page for it) is reported, not left unhandled
  const toast = useToast();
  const openRecord = (id: string) => {
    context.navigation
      .openForm({ entityName: entity.logicalName, entityId: id })
      .catch((err) => toast.error("Failed to open the record: " + String(err)));
  };

  const [dataset] = useState(() => {
    // LogicalName becomes the entity type of opened records (the metadata type comes from Xrm's)
    const metadata = {
      LogicalName: entity.logicalName,
      PrimaryIdAttribute: entity.primaryIdAttribute,
      PrimaryNameAttribute: entity.primaryNameAttribute,
    };
    const dataset = new Dataset(new MemoryDataProvider({ dataSource: [], metadata }));
    dataset.setColumns(columns);
    // A memory provider doesn't open records itself; hand them to the context like a form would
    dataset.setInterceptor("onOpenDatasetItem", (entityReference) => openRecord(entityReference.id.guid));
    dataset.setInterceptor("onRetrieveRecordCommand", async (options, defaultAction) => {
      const defaults = await defaultAction(options);
      // The dataset's own Refresh would re-read the provider's rows; ours re-queries the page's data
      const standard = defaults.map((command) =>
        command.commandId === DatasetConstants.REFRESH_COMMAND_ID && onRefreshRef.current
          ? { ...command, execute: async () => void (await onRefreshRef.current?.()) }
          : command
      );
      return [...(commandsRef.current ?? []).map(toCommand), ...standard];
    });
    return dataset;
  });

  // The ribbon's commands, asked from the dataset again whenever it has new data (their state, e.g.
  // Save, follows it); null until the first answer
  const [ribbonCommands, setRibbonCommands] = useState<ICommand[] | null>(null);
  const loadRibbonCommands = useCallback(() => {
    void dataset.retrieveRecordCommand([], [], false, false, false).then(setRibbonCommands);
  }, [dataset]);
  useEffect(() => {
    if (showRibbon) loadRibbonCommands();
  }, [showRibbon, loadRibbonCommands]);
  useEventEmitter(dataset, "onNewDataLoaded", () => showRibbon && loadRibbonCommands());

  // New query results replace the provider's rows; refresh() is what makes the grid re-read them.
  useEffect(() => {
    if (!rows) return;
    dataset.setDataSource(rows);
    void dataset.refresh();
  }, [dataset, rows]);

  // A phone has no room for a table: the same records as cards (see RecordCards)
  const grid = isPhone ? (
    <RecordCards
      dataset={dataset}
      columns={columns}
      onOpen={
        entity.formPath
          ? openRecord
          : undefined
      }
    />
  ) : (
    <Grid
      context={context}
      parameters={{
        Grid: dataset,
        SelectableRows: { raw: "none" },
        EnableNavigation: { raw: !!entity.formPath },
        EnableOptionSetColors: { raw: true },
      }}
      onOverrideComponentProps={(props) => ({ ...props, rowClass: rowClassName })}
    />
  );
  if (!showRibbon) return grid;

  return (
    <div>
      <NestedControlRenderer
        context={context}
        parameters={{
          ControlName: "Ribbon",
          Bindings: {
            Commands: { type: "Object", value: ribbonCommands ?? [], isStatic: true },
            Loading: { type: "TwoOptions", value: ribbonCommands === null, isStatic: true },
          },
        }}
      />
      {grid}
    </div>
  );
}

