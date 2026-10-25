import type { IColumn, IDataset, IRecord } from '@talxis/client-libraries';

const QUANTITY = 'lab_availablequantity';
const REORDER_POINT = 'lab_reorderpoint';
const LOW_STOCK_FALLBACK = 10;
const LOW_STOCK_BACKGROUND = '#FDE7E9';

let current: IDataset | undefined;
const waiting: ((dataset: IDataset) => void)[] = [];

export class GridApi {
    /** Called by the TALXIS Grid (ClientApiFunctionName) once its dataset exists. */
    public static onDatasetControlInitialized(parameters: { controlId: string, dataset: IDataset }): void {
        const { dataset } = parameters;
        current = dataset;
        dataset.addEventListener('onDestroyed', () => { if (current === dataset) current = undefined; });
        GridApi.customizeItemsGrid(dataset);
        waiting.splice(0).forEach(resolve => resolve(dataset));
    }

    /** Resolves with the Grid's dataset, whether the Grid initialized before or after the call. */
    public static getDataset(): Promise<IDataset> {
        if (current) return Promise.resolve(current);
        return new Promise(resolve => waiting.push(resolve));
    }

    private static customizeItemsGrid(dataset: IDataset): void {
        dataset.setInterceptor('columns', (columns: IColumn[]) => columns.map(column =>
            column.name === QUANTITY ? { ...column, displayName: 'Qty on hand' } : column));

        dataset.addEventListener('onRecordLoaded', (record: IRecord) => {
            record.expressions?.ui.setCustomFormattingExpression(QUANTITY, () => {
                // Group headers and aggregate rows are never highlighted
                if (record.getSummarizationType() !== 'none') return undefined;
                const quantity = record.getValue(QUANTITY) as number | null | undefined;
                if (quantity == null) return undefined;
                const reorderPoint = (record.getValue(REORDER_POINT) as number | null | undefined) ?? LOW_STOCK_FALLBACK;
                return quantity <= reorderPoint ? { backgroundColor: LOW_STOCK_BACKGROUND } : undefined;
            });
        });
    }
}
