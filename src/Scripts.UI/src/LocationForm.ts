import { GridApi } from './GridApi';

export class LocationForm {
    public static async onLoad(executionContext: Xrm.Events.EventContext): Promise<void> {
        const formContext = executionContext.getFormContext();
        const dataset = await GridApi.getDataset();
        const showCount = () => formContext.ui.setFormNotification(
            `TALXIS Grid ready — ${dataset.sortedRecordIds.length} warehouse item(s) loaded`,
            'INFO', 'talxisgrid');

        dataset.addEventListener('onNewDataLoaded', showCount);
        if (!dataset.loading) showCount();
    }
}
