#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                            18: Barcode Scan UI                                         ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Adds a "Scan Barcode" button to the item detail page (CP09), in the header of its form. It opens a dialog that decodes
# a barcode with the device camera (@zxing/browser) or accepts one typed in manually, looks
# it up via the connector, and on confirmation upserts a Product record, links it to the item,
# and shows its image (once linked) via a new LinkedProductImage component.
#
# Both components are new, standalone files, patched onto the existing item detail page rather
# than baked into the CP09 template, since they depend on connector wiring that doesn't exist
# until this checkpoint.
#
# Expects: Apps.WarehousePicking's item detail page (CP09) and the connector data source
# (step 3, scaffold/17-connector-datasource.ps1) already in place.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Barcode Scan UI ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'barcodeScanUiScaffolded')) {
    $appSrc = "src/Apps.WarehousePicking/src"
    $prefixPascal = [char]::ToUpper($PublisherPrefix[0]) + $PublisherPrefix.Substring(1)
    $uiTokens = @{ PREFIX = $PublisherPrefix; PASCAL = $prefixPascal }

    Expand-LabTemplate -Path "18-barcode-scan-ui/Binary.ts" `
        -Destination "$appSrc/utils/Binary.ts"
    Write-Host "  ✓ utils/Binary.ts" -ForegroundColor Green

    # Replaces the do-nothing barcode lookup the phone screens ship with (05f): from now on a barcode
    # that matches no item on the Receive screen is looked up in Open Food Facts to prefill the new
    # item, and the item is linked to its Product record.
    Expand-LabTemplate -Path "18-barcode-scan-ui/BarcodeLookup.ts" `
        -Destination "$appSrc/utils/BarcodeLookup.ts" `
        -Tokens $uiTokens
    Write-Host "  ✓ utils/BarcodeLookup.ts (Open Food Facts)" -ForegroundColor Green

    foreach ($component in @("BarcodeScanDialog", "LinkedProductImage")) {
        Expand-LabTemplate -Path "18-barcode-scan-ui/$component.tsx" `
            -Destination "$appSrc/components/$component.tsx" `
            -Tokens $uiTokens
        Expand-LabTemplate -Path "18-barcode-scan-ui/$component.styles.ts" `
            -Destination "$appSrc/styles/$component.styles.ts"
        Write-Host "  ✓ components/$component.tsx (+ styles/$component.styles.ts)" -ForegroundColor Green
    }

    $detailPagePath = "$appSrc/pages/WarehouseItemDetail.tsx"
    if (-not (Test-Path $detailPagePath)) {
        throw "$detailPagePath not found - run CP09 first."
    }
    $detailPage = Get-Content $detailPagePath -Raw

    if ($detailPage.Contains("BarcodeScanDialog")) {
        Write-Host "  ✓ WarehouseItemDetail.tsx (already wired)" -ForegroundColor Green
    } else {
        $importAnchor = 'import { ArrowLeftRegular } from "@fluentui/react-icons";'
        $importReplacement = @"
$importAnchor
import BarcodeScanDialog from "@/components/BarcodeScanDialog";
import LinkedProductImage from "@/components/LinkedProductImage";
import { ${prefixPascal}_productsService } from "@/generated/services/${prefixPascal}_productsService";
"@
        if (-not $detailPage.Contains($importAnchor)) { throw "WarehouseItemDetail.tsx: import anchor not found - CP09 template may have changed." }
        $detailPage = $detailPage.Replace($importAnchor, $importReplacement)

        # The linked-product lookup is a hook, so it has to run on every render alongside the
        # page's other hooks - it can't be declared further down next to the JSX that uses it,
        # since that JSX sits after the itemLoading/!item early returns.
        $mutationAnchor = '  const createTxMutation = useMutation({'
        $mutationReplacement = @"
  const linkedProductId = item?._${PublisherPrefix}_productid_value;
  const { data: linkedProduct } = useQuery({
    queryKey: ["linkedProduct", linkedProductId],
    queryFn: async () => {
      const result = await ${prefixPascal}_productsService.get(linkedProductId!);
      return result.data;
    },
    enabled: !!linkedProductId,
  });

$mutationAnchor
"@
        if (-not $detailPage.Contains($mutationAnchor)) { throw "WarehouseItemDetail.tsx: mutation anchor not found - CP09 template may have changed." }
        $detailPage = $detailPage.Replace($mutationAnchor, $mutationReplacement)

        # The scan button and the linked product go into the detail form's header (its headerExtras
        # slot, on the right of the record title), reusing the page's own inline/muted/name styles
        # (styles/WarehouseItemDetail.styles.ts), so the patch needs no new style entries.
        $headerAnchor = '            onBack={() => navigate("/items")}'
        $headerReplacement = @"
            headerExtras={
              <>
                <BarcodeScanDialog
                  itemId={id!}
                  currentProductId={linkedProductId}
                  onLinked={() => queryClient.refetchQueries({ queryKey: ["warehouseItem", id] })}
                />
                {linkedProduct && (
                  <div className={styles.inline} data-testid="linked-product-name">
                    <LinkedProductImage productId={linkedProductId!} />
                    <Body1 className={styles.muted}>Linked product:</Body1>
                    <Body1 className={styles.name}>{linkedProduct.${PublisherPrefix}_name}</Body1>
                  </div>
                )}
              </>
            }
$headerAnchor
"@
        if (-not $detailPage.Contains($headerAnchor)) { throw "WarehouseItemDetail.tsx: header anchor not found - CP09 template may have changed." }
        $detailPage = $detailPage.Replace($headerAnchor, $headerReplacement)

        Set-Content -Path $detailPagePath -Value $detailPage -Encoding UTF8 -NoNewline
        Write-Host "  ✓ WarehouseItemDetail.tsx (Scan Barcode button + linked product wired)" -ForegroundColor Green
    }

    Set-LabValue 'barcodeScanUiScaffolded' $true
} else {
    Write-Host "  ✓ Barcode Scan UI (exists)" -ForegroundColor Green
}

Write-Host "  ℹ Local preview: cd src/Apps.WarehousePicking && npm run dev" -ForegroundColor DarkGray
