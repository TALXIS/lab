export class RibbonActions {
    public static async checkStockLevels(primaryControl: Xrm.FormContext): Promise<void> {
        const name = primaryControl.getAttribute<Xrm.Attributes.StringAttribute>('lab_name')?.getValue() || 'Unknown';
        const qty = primaryControl.getAttribute<Xrm.Attributes.NumberAttribute>('lab_availablequantity')?.getValue() ?? 0;
        const reorder = primaryControl.getAttribute<Xrm.Attributes.NumberAttribute>('lab_reorderpoint')?.getValue() ?? 0;

        const status = qty <= reorder
            ? `⚠ Below reorder point (${reorder}). Consider restocking.`
            : `✓ Stock is above reorder point (${reorder}).`;

        await Xrm.Navigation.openAlertDialog({
            title: 'Stock Check',
            text: `Stock level for ${name}: ${qty} units.\n${status}`,
        });
    }
}
