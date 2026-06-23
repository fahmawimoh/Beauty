using Beauty.Application.Common;

namespace Beauty.Application.Tests;

public class PhoneNumberValidatorTests
{
    [Theory]
    [InlineData("0788055851", "0788055851")]
    [InlineData("+962 78-805-5851", "962788055851")]
    [InlineData("(078) 8055851", "0788055851")]
    public void ValidateAndNormalize_ValidPhone_ReturnsDigits(string phone, string expected)
    {
        var normalized = PhoneNumberValidator.ValidateAndNormalize(phone);
        Assert.Equal(expected, normalized);
    }

    [Fact]
    public void ValidateAndNormalize_EmptyPhone_ThrowsRequired()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            PhoneNumberValidator.ValidateAndNormalize("", required: true));
        Assert.Equal("Phone number is required.", ex.Message);
    }

    [Fact]
    public void ValidateAndNormalize_TooShort_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            PhoneNumberValidator.ValidateAndNormalize("123456", required: true));
        Assert.Contains("at least", ex.Message);
    }
}
