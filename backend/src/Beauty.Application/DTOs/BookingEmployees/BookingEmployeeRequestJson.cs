using System.Text.Json;

namespace Beauty.Application.DTOs.BookingEmployees;

public static class BookingEmployeeRequestJson
{
    public static CreateBookingEmployeeRequest ParseCreate(JsonElement body, JsonSerializerOptions options)
    {
        var request = body.Deserialize<CreateBookingEmployeeRequest>(options);
        var phoneNumber = ReadPhoneNumber(body);

        if (request is null)
        {
            return new CreateBookingEmployeeRequest(
                ReadString(body, "name") ?? string.Empty,
                phoneNumber,
                ReadGuid(body, "branchId"),
                ReadString(body, "notes"),
                ReadInt(body, "defaultSlotDurationMinutes"),
                ReadSchedules(body, options));
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber) && !string.IsNullOrWhiteSpace(phoneNumber))
            return request with { PhoneNumber = phoneNumber };

        return request;
    }

    public static UpdateBookingEmployeeRequest ParseUpdate(JsonElement body, JsonSerializerOptions options)
    {
        var request = body.Deserialize<UpdateBookingEmployeeRequest>(options);
        var phoneNumber = ReadPhoneNumber(body);

        if (request is null)
        {
            return new UpdateBookingEmployeeRequest(
                ReadString(body, "name") ?? string.Empty,
                phoneNumber,
                ReadGuid(body, "branchId"),
                ReadBool(body, "isActive") ?? true,
                ReadString(body, "notes"),
                ReadInt(body, "defaultSlotDurationMinutes"),
                ReadSchedules(body, options));
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber) && !string.IsNullOrWhiteSpace(phoneNumber))
            return request with { PhoneNumber = phoneNumber };

        return request;
    }

    private static IReadOnlyList<EmployeeScheduleInput>? ReadSchedules(JsonElement body, JsonSerializerOptions options) =>
        TryGetProperty(body, "schedules", out var schedules)
            ? schedules.Deserialize<IReadOnlyList<EmployeeScheduleInput>>(options)
            : null;

    private static string? ReadPhoneNumber(JsonElement body)
    {
        if (TryGetProperty(body, "phoneNumber", out var phoneNumber))
            return phoneNumber.GetString();
        if (TryGetProperty(body, "phone", out var phone))
            return phone.GetString();
        return null;
    }

    private static string? ReadString(JsonElement body, string propertyName) =>
        TryGetProperty(body, propertyName, out var value) ? value.GetString() : null;

    private static Guid? ReadGuid(JsonElement body, string propertyName) =>
        TryGetProperty(body, propertyName, out var value) && value.TryGetGuid(out var guid) ? guid : null;

    private static int? ReadInt(JsonElement body, string propertyName) =>
        TryGetProperty(body, propertyName, out var value) && value.TryGetInt32(out var number) ? number : null;

    private static bool? ReadBool(JsonElement body, string propertyName) =>
        TryGetProperty(body, propertyName, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean()
            : null;

    private static bool TryGetProperty(JsonElement body, string propertyName, out JsonElement value)
    {
        if (body.TryGetProperty(propertyName, out value))
            return true;

        foreach (var property in body.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}
