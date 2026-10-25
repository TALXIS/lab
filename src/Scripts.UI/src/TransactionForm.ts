export class TransactionForm {
    public static onLoad(executionContext: Xrm.Events.EventContext): void {
        const formContext = executionContext.getFormContext();
        const dateAttr = formContext.getAttribute<Xrm.Attributes.DateAttribute>('lab_transactiondate');
        const isCreateForm = formContext.ui.getFormType() === 1;
        if (isCreateForm && dateAttr && !dateAttr.getValue()) {
            dateAttr.setValue(new Date());
        }
    }

    public static async onQuantityChange(executionContext: Xrm.Events.EventContext): Promise<void> {
        const formContext = executionContext.getFormContext();
        const quantity = formContext.getAttribute<Xrm.Attributes.NumberAttribute>('lab_quantity')?.getValue();
        const item = formContext.getAttribute<Xrm.Attributes.LookupAttribute>('lab_itemid')?.getValue();
        if (quantity == null || !item?.length) return;

        try {
            const record = await Xrm.WebApi.retrieveRecord(
                'lab_warehouseitem',
                item[0].id.replace(/[{}]/g, ''),
                '?$select=lab_unitprice');
            const unitPrice = record['lab_unitprice'] as number | null | undefined;
            if (unitPrice == null) return;
            formContext.getAttribute<Xrm.Attributes.NumberAttribute>('lab_totalvalue')?.setValue(quantity * unitPrice);
        } catch {
            // The total is a convenience: leave it unchanged rather than interrupt the user
        }
    }
}
