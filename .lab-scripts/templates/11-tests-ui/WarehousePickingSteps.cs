using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Reqnroll;
using Tests.UI.Support;
using static Microsoft.Playwright.Assertions;

namespace Tests.UI.StepDefinitions;

// Steps for the Warehouse Picking code app — a standalone Vite + React SPA, not a page
// embedded in the model-driven app shell, so it can't reuse Support/Bindings/NavigationSteps'
// "I open the '<app>' app" (that step navigates to main.aspx?appname=..., a model-driven-app
// -only URL). Same "custom UI needs custom bindings" split the frozen bindings' own docs
// describe for a genux dashboard page — the difference here is the whole app is outside the
// MDA shell, not just one page inside it, so even navigation is custom, not just assertions.
// Kept in StepDefinitions/, not Support/Bindings/, to signal "ours, not template-shipped."
[Binding]
public sealed class WarehousePickingSteps
{
    // The code app has no fixed deployed URL in this lab — attendees run it locally. Point at
    // the Vite dev server the CP12 "try it live" pause tells you to start with `npm run dev`.
    // Override with TXC_CODEAPP_URL once the app is actually deployed and you want to test
    // that URL instead.
    private const string DefaultCodeAppUrl = "http://localhost:5173";

    private readonly ScenarioContext _scenarioContext;
    private IPage Page => (IPage)_scenarioContext[Hooks.PageKey];

    // Captured from the UI when the item is opened, not assumed from the CMT seed data —
    // this is a real, shared Dataverse environment with no test fixture/teardown, and CP12's
    // own "try it live" walkthrough picks from these same records, so the absolute quantity
    // drifts across lab runs. Every assertion below is relative to this captured baseline.
    private int _startingQuantity;

    // The items list is a TALXIS base-controls Grid (AG Grid underneath); the page marks each of its
    // rows with this class, since the grid has no per-row test id hook.
    private ILocator ItemRows => Page.Locator(".warehouse-item-row");

    public WarehousePickingSteps(ScenarioContext scenarioContext)
    {
        _scenarioContext = scenarioContext;
    }

    [Given("I open the warehouse picking app")]
    public async Task GivenIOpenTheWarehousePickingApp()
    {
        var baseUrl = Environment.GetEnvironmentVariable("TXC_CODEAPP_URL") ?? DefaultCodeAppUrl;
        await Page.GotoAsync(baseUrl);
        // The app opens on Home (the quick-action tiles); the items list is its Items tab
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Items" }).ClickAsync();
        await ItemRows.First.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
    }

    [Given("I open the {string} item")]
    public async Task GivenIOpenTheItem(string itemName)
    {
        var row = ItemRows.Filter(new() { HasText = itemName });
        await row.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        // The grid renders the record name as an <a> without an href, so it has no link role
        await row.Locator("a").First.ClickAsync();

        // The quantity is a read-only field of the item's detail form: item-detail-qty wraps its input,
        // which shows the number with thousands separators ("1,000")
        var quantityLocator = Page.GetByTestId("item-detail-qty").Locator("input");
        await quantityLocator.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        var quantityText = await quantityLocator.InputValueAsync();
        if (!int.TryParse(quantityText.Trim(), NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out _startingQuantity))
        {
            Assert.Fail($"Expected a numeric qty on hand but found '{quantityText}'.");
        }
    }

    [When("I pick a quantity of {string}")]
    public async Task WhenIPickAQuantityOf(string quantity)
    {
        await SubmitPickAsync(quantity);
    }

    [When("I try to pick more than the available quantity")]
    public async Task WhenITryToPickMoreThanTheAvailableQuantity()
    {
        await SubmitPickAsync((_startingQuantity + 1).ToString());
    }

    [Then("I should see an error that the requested quantity exceeds the available stock")]
    public async Task ThenIShouldSeeAnErrorThatTheRequestedQuantityExceedsTheAvailableStock()
    {
        var requested = _startingQuantity + 1;
        var message = $"Not enough product in stock. Available: {_startingQuantity}, requested: {requested}.";
        // Scoped to the toast's title via Fluent's static fui-ToastTitle class (public API, see
        // toastTitleClassNames): the Toaster also repeats the text in a screen-reader live region,
        // so a bare GetByText would match twice and trip Playwright's strict mode. A role query
        // doesn't work either - the open New Transaction dialog hides the toast from the a11y tree.
        var toast = Page.Locator(".fui-ToastTitle").Filter(new() { HasText = message });
        await Expect(toast).ToBeVisibleAsync(new() { Timeout = 15000 });
    }

    [Then("the quantity on hand should have decreased by {string}")]
    public async Task ThenTheQuantityOnHandShouldHaveDecreasedBy(string decrement)
    {
        var expected = _startingQuantity - int.Parse(decrement);
        // The pick was made from the Transactions tab; the quantity is on the General one
        await OpenItemTabAsync("general");
        await ExpectQuantityOnHandAsync(expected);
    }

    // The quick actions on the Home screen, driven the way a worker would: tile, item, quantity, confirm.

    [When("I receive {string} of {string} from the home screen")]
    public async Task WhenIReceiveFromTheHomeScreen(string quantity, string itemName)
    {
        await OpenHomeTileAsync("receive");
        await ChooseQuickItemAsync(itemName);
        await Page.Locator("#quick-quantity").FillAsync(quantity);
        await ConfirmQuickFlowAsync();
    }

    [When("I take inventory of {string} counting {string} fewer than recorded")]
    public async Task WhenITakeInventoryCountingFewerThanRecorded(string itemName, string fewer)
    {
        await OpenHomeTileAsync("inventory");
        await ChooseQuickItemAsync(itemName);
        await Page.Locator("#counted-quantity").FillAsync((_startingQuantity - int.Parse(fewer)).ToString());
        await ConfirmQuickFlowAsync();
    }

    [Then("the quantity on hand of {string} should have increased by {string}")]
    public async Task ThenTheQuantityOnHandOfShouldHaveIncreasedBy(string itemName, string increment)
    {
        await OpenItemFromTheListAsync(itemName);
        await ExpectQuantityOnHandAsync(_startingQuantity + int.Parse(increment));
    }

    [Then("the quantity on hand of {string} should have decreased by {string}")]
    public async Task ThenTheQuantityOnHandOfShouldHaveDecreasedBy(string itemName, string decrement)
    {
        await OpenItemFromTheListAsync(itemName);
        await ExpectQuantityOnHandAsync(_startingQuantity - int.Parse(decrement));
    }

    private async Task OpenHomeTileAsync(string tile)
    {
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Home" }).ClickAsync();
        await Page.GetByTestId($"tile-{tile}").ClickAsync();
    }

    private async Task ChooseQuickItemAsync(string itemName)
    {
        var row = Page.GetByTestId("pick-item-row").Filter(new() { HasText = itemName });
        await row.First.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        await row.First.ClickAsync();
    }

    private async Task ConfirmQuickFlowAsync()
    {
        await Page.GetByTestId("flow-confirm").ClickAsync();
        await Page.GetByTestId("flow-result").WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
    }

    private async Task OpenItemFromTheListAsync(string itemName)
    {
        await Page.GetByRole(AriaRole.Tab, new() { Name = "Items" }).ClickAsync();
        var row = ItemRows.Filter(new() { HasText = itemName });
        await row.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        await row.Locator("a").First.ClickAsync();
    }

    // The input shows thousands separators, the expected value is the plain number
    private async Task ExpectQuantityOnHandAsync(int expected)
    {
        var plain = Regex.Escape(expected.ToString());
        var grouped = Regex.Escape(expected.ToString("N0", CultureInfo.InvariantCulture));
        await Expect(Page.GetByTestId("item-detail-qty").Locator("input"))
            .ToHaveValueAsync(new Regex($"^{plain}$|^{grouped}$"), new() { Timeout = 15000 });
    }

    // CI/Playwright runners have no camera - the scan dialog's manual EAN input is the test
    // hook BarcodeScanDialog.tsx exposes for exactly this case, so this step never touches the
    // (unavailable) camera path at all.
    [When("I enter the barcode {string} and look it up")]
    public async Task WhenIEnterTheBarcodeAndLookItUp(string barcode)
    {
        await Page.GetByTestId("scan-barcode-button").ClickAsync();
        var eanInput = Page.GetByTestId("scan-ean-input");
        await eanInput.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        await eanInput.FillAsync(barcode);
        await Page.GetByTestId("scan-lookup-button").ClickAsync();
    }

    [Then("I should see the product {string} in the scan preview")]
    public async Task ThenIShouldSeeTheProductInTheScanPreview(string productName)
    {
        await Expect(Page.GetByTestId("scan-product-name")).ToHaveTextAsync(productName, new() { Timeout = 15000 });
    }

    [When("I link the scanned product to the item")]
    public async Task WhenILinkTheScannedProductToTheItem()
    {
        await Page.GetByTestId("scan-link-button").ClickAsync();
    }

    [Then("the item should show {string} as its linked product")]
    public async Task ThenTheItemShouldShowAsItsLinkedProduct(string productName)
    {
        await Expect(Page.GetByTestId("linked-product-name")).ToContainTextAsync(productName, new() { Timeout = 15000 });
    }

    // The item page's form tabs carry data-id="tab-header-<id>" (the app's top navigation has tabs
    // too, so a role/name query for "Transactions" would match twice)
    private async Task OpenItemTabAsync(string tabId)
    {
        await Page.Locator($"[data-id='tab-header-{tabId}']").ClickAsync();
    }

    // A "pick" in the UI is a New Transaction with type Outbound — fill the dialog the same
    // way a floor worker would: name, quantity, type, submit.
    private async Task SubmitPickAsync(string quantity)
    {
        // New Transaction is a command on the Transactions tab's grid ribbon (the "new" command)
        await OpenItemTabAsync("transactions");
        await Page.Locator("[data-command='new']").ClickAsync();
        // The dialog's fields are base-controls Form controls: each sits in a field-<name> wrapper
        var quantityInput = Page.GetByTestId("field-quantity").Locator("input");
        await quantityInput.WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
        await Page.GetByTestId("field-name").Locator("input").FillAsync($"BDD pick {DateTime.UtcNow:yyyyMMddHHmmss}");
        await quantityInput.FillAsync(quantity);
        await Page.GetByTestId("field-transactiontype").Locator("input").ClickAsync();
        await Page.GetByRole(AriaRole.Option, new() { Name = "Outbound" }).ClickAsync();
        await Page.GetByTestId("submit-transaction").ClickAsync();
    }
}
