using System.Text.Json;
using Beauty.Application.DTOs.BookingEmployees;

var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
const string json = """{"branchId":"98fd997f-397a-4809-917b-a1cad883db0c","name":"sara","phone":"0788055851","phoneNumber":"0788055851","defaultSlotDurationMinutes":30,"notes":null}""";
var direct = JsonSerializer.Deserialize<CreateBookingEmployeeRequest>(json, options);
Console.WriteLine($"Direct: Name={direct?.Name}, PhoneNumber={direct?.PhoneNumber ?? "NULL"}");
using var doc = JsonDocument.Parse(json);
var parsed = BookingEmployeeRequestJson.ParseCreate(doc.RootElement, options);
Console.WriteLine($"ParseCreate: Name={parsed.Name}, PhoneNumber={parsed.PhoneNumber ?? "NULL"}");
