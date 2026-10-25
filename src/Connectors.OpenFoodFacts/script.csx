using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

public class Script : ScriptBase
{
    private const string UserAgent = "TALXIS-Lab-WarehousePicking/1.0 (+https://github.com/TALXIS/lab)";

    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        if (string.Equals(this.Context.OperationId, "GetProductImage", StringComparison.OrdinalIgnoreCase))
        {
            return await GetProductImageAsync().ConfigureAwait(false);
        }

        return await GetProductByBarcodeAsync().ConfigureAwait(false);
    }

    private async Task<HttpResponseMessage> GetProductByBarcodeAsync()
    {
        this.Context.Request.Headers.UserAgent.ParseAdd(UserAgent);
        var response = await this.Context.SendAsync(this.Context.Request, this.CancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return response;
        }

        var body = JObject.Parse(await response.Content.ReadAsStringAsync().ConfigureAwait(false));
        if ((int?)body["status"] != 1)
        {
            return Json(HttpStatusCode.NotFound, "{\"message\": \"No product found for this barcode\"}");
        }

        var product = body["product"];
        var flattened = new JObject
        {
            ["ean"] = (string)body["code"],
            ["name"] = (string)product?["product_name"],
            ["brand"] = (string)product?["brands"],
            ["quantity"] = (string)product?["quantity"],
            ["imageUrl"] = (string)product?["image_url"],
        };
        response.Content = CreateJsonContent(flattened.ToString());
        return response;
    }

    private async Task<HttpResponseMessage> GetProductImageAsync()
    {
        var imageUrl = GetQueryParameter(this.Context.Request.RequestUri, "imageUrl");
        if (string.IsNullOrEmpty(imageUrl))
        {
            return Json(HttpStatusCode.BadRequest, "{\"message\": \"imageUrl query parameter is required\"}");
        }

        // Only Open Food Facts image hosts, so the connector can't be used as an open proxy.
        Uri uri;
        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !(uri.Host == "openfoodfacts.org" || uri.Host.EndsWith(".openfoodfacts.org", StringComparison.OrdinalIgnoreCase)))
        {
            return Json(HttpStatusCode.BadRequest, "{\"message\": \"imageUrl must be an https Open Food Facts image URL\"}");
        }

        this.Context.Request.RequestUri = uri;
        this.Context.Request.Headers.UserAgent.ParseAdd(UserAgent);
        return await this.Context.SendAsync(this.Context.Request, this.CancellationToken).ConfigureAwait(false);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json)
    {
        return new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }

    private static string GetQueryParameter(Uri requestUri, string name)
    {
        var query = requestUri.Query.TrimStart('?');
        foreach (var pair in query.Split('&'))
        {
            var parts = pair.Split(new[] { '=' }, 2);
            if (parts.Length == 2 && parts[0] == name)
            {
                return Uri.UnescapeDataString(parts[1]);
            }
        }

        return null;
    }
}
