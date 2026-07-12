using System.Text.Json;
using Beauty.Application.DTOs.BookingEmployees;

namespace Beauty.Application.Tests;

public class BookingEmployeeRequestBindingTests
{
    private static readonly JsonSerializerOptions Options = CreateAspNetJsonOptions();

    private static JsonSerializerOptions CreateAspNetJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.PropertyNameCaseInsensitive = true;
        return options;
    }

    [Fact]
    public void ParseCreate_ExactUserPayload_BindsPhoneNumber()
    {
        const string json = """
            {
              "branchId": "98fd997f-397a-4809-917b-a1cad883db0c",
              "name": "sara",
              "phone": "0788055851",
              "phoneNumber": "0788055851",
              "defaultSlotDurationMinutes": 30,
              "notes": null
            }
            """;

        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseCreate(document.RootElement, Options);

        Assert.Equal("sara", request.Name);
        Assert.Equal("0788055851", request.PhoneNumber);
    }

    [Fact]
    public void ParseCreate_PhoneNumberOnly_BindsPhoneNumber()
    {
        const string json = """{"name":"sara","phoneNumber":"0788055851"}""";
        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseCreate(document.RootElement, Options);

        Assert.Equal("0788055851", request.PhoneNumber);
    }

    [Fact]
    public void ParseCreate_PhoneAliasOnly_BindsPhoneNumber()
    {
        const string json = """{"name":"sara","phone":"0788055851"}""";
        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseCreate(document.RootElement, Options);

        Assert.Equal("0788055851", request.PhoneNumber);
    }

    [Fact]
    public void ParseCreate_WithSchedules_BindsPhoneNumber()
    {
        const string json = """
            {
              "name": "sara",
              "phoneNumber": "0788055851",
              "defaultSlotDurationMinutes": 30,
              "schedules": [
                {
                  "dayOfWeek": "Monday",
                  "startTime": "09:00",
                  "endTime": "17:00",
                  "isWorkingDay": true,
                  "breaks": []
                }
              ]
            }
            """;

        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseCreate(document.RootElement, Options);

        Assert.Equal("0788055851", request.PhoneNumber);
        Assert.Single(request.Schedules!);
    }

    [Fact]
    public void ParseUpdate_WithSchedules_BindsAllFields()
    {
        const string json = """
            {
              "branchId": "98fd997f-397a-4809-917b-a1cad883db0c",
              "name": "Sara Updated",
              "phoneNumber": "0788055851",
              "isActive": true,
              "notes": "Updated notes",
              "defaultSlotDurationMinutes": 45,
              "schedules": [
                {
                  "dayOfWeek": "Monday",
                  "startTime": "09:00",
                  "endTime": "17:00",
                  "isWorkingDay": true,
                  "breaks": [{ "startTime": "12:00", "endTime": "13:00" }]
                }
              ]
            }
            """;

        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseUpdate(document.RootElement, Options);

        Assert.Equal("Sara Updated", request.Name);
        Assert.Equal("0788055851", request.PhoneNumber);
        Assert.True(request.IsActive);
        Assert.Equal("Updated notes", request.Notes);
        Assert.Equal(45, request.DefaultSlotDurationMinutes);
        Assert.Single(request.Schedules!);
    }

    [Fact]
    public void ParseUpdate_PhoneAliasOnly_BindsPhoneNumber()
    {
        const string json = """{"name":"sara","phone":"0788055851","isActive":true}""";
        using var document = JsonDocument.Parse(json);
        var request = BookingEmployeeRequestJson.ParseUpdate(document.RootElement, Options);

        Assert.Equal("0788055851", request.PhoneNumber);
    }
}
