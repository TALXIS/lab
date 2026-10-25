import { Lab_warehouseitemslab_category } from "@/generated/models/Lab_warehouseitemsModel";
import { Lab_warehousetransactionslab_transactiontype } from "@/generated/models/Lab_warehousetransactionsModel";

const categoryLabels = Lab_warehouseitemslab_category;

// Option set choices as base-controls option metadata (OptionSet control options, grid columns)
const toOptionMetadata = (labels: Record<number, string>) =>
  Object.entries(labels).map(([value, label]) => ({ Value: Number(value), Label: label, Color: "" }));

export const categoryOptionMetadata = toOptionMetadata(categoryLabels);
export const transactionTypeOptionMetadata = toOptionMetadata(Lab_warehousetransactionslab_transactiontype);

// statecode as a grid option set column: Active/Inactive with the same colors on every page
export const statusOptions = [
  { Value: 0, Label: "Active", Color: "#107C10" },
  { Value: 1, Label: "Inactive", Color: "#C50F1F" },
];

