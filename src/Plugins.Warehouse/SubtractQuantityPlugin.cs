using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using TALXIS.DevKit.Build.Dataverse.Plugin;

namespace Plugins.Warehouse
{
    [PluginStep("Create", "lab_warehousetransaction", PluginStage.PostOperation)]
    public class SubtractQuantityPlugin : PluginBase
    {
        private const int Inbound = 100000000;
        private const int Outbound = 100000001;

        public SubtractQuantityPlugin() : base(typeof(SubtractQuantityPlugin))
        {
        }

        public SubtractQuantityPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(SubtractQuantityPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            var context = localPluginContext.PluginExecutionContext;
            if (!(context.InputParameters.TryGetValue("Target", out var targetObject) && targetObject is Entity target)
                || target.LogicalName != "lab_warehousetransaction")
            {
                return;
            }

            if (!target.Contains("lab_quantity") || !target.Contains("lab_itemid") || !target.Contains("lab_transactiontype"))
            {
                return;
            }

            var quantity = target.GetAttributeValue<int>("lab_quantity");
            var itemRef = target.GetAttributeValue<EntityReference>("lab_itemid");
            var type = target.GetAttributeValue<OptionSetValue>("lab_transactiontype")?.Value;

            var service = localPluginContext.OrgSvcFactory.CreateOrganizationService(context.UserId);
            var item = service.Retrieve("lab_warehouseitem", itemRef.Id, new ColumnSet("lab_availablequantity"));
            var available = item.GetAttributeValue<int?>("lab_availablequantity") ?? 0;

            int newQuantity;
            if (type == Inbound)
            {
                newQuantity = available + quantity;
            }
            else if (type == Outbound)
            {
                newQuantity = available - quantity;
            }
            else
            {
                return;
            }

            service.Update(new Entity("lab_warehouseitem", itemRef.Id) { ["lab_availablequantity"] = newQuantity });
        }
    }
}
