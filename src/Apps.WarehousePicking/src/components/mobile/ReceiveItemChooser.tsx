import { useState } from "react";
import { ItemPicker } from "@/components/mobile/ItemPicker";
import { NewItemDialog } from "@/components/mobile/NewItemDialog";
import type { PickItem } from "@/hooks/UsePickItems";
import { useStyles } from "@/styles/ReceiveItemChooser.styles";

type ReceiveItemChooserProps = {
  onSelect: (item: PickItem) => void;
};

export function ReceiveItemChooser({ onSelect }: ReceiveItemChooserProps) {
  const styles = useStyles();
  const [newItemName, setNewItemName] = useState<string | undefined>();
  const [newItemOpen, setNewItemOpen] = useState(false);

  return (
    <div className={styles.root}>
      <ItemPicker
        onSelect={onSelect}
        onCreate={(search) => {
          setNewItemName(search || undefined);
          setNewItemOpen(true);
        }}
      />
      <NewItemDialog
        open={newItemOpen}
        onOpenChange={setNewItemOpen}
        defaults={{ name: newItemName }}
        onCreated={(item) => {
          setNewItemOpen(false);
          onSelect(item);
        }}
      />
    </div>
  );
}

