namespace Beauty.Application.Common;

public static class PasswordValidator
{
    public const int MinLength = 8;

    public static void Validate(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinLength)
            throw new InvalidOperationException($"Password must be at least {MinLength} characters.");

        if (!password.Any(char.IsUpper))
            throw new InvalidOperationException("Password must contain at least one uppercase letter.");

        if (!password.Any(char.IsLower))
            throw new InvalidOperationException("Password must contain at least one lowercase letter.");

        if (!password.Any(char.IsDigit))
            throw new InvalidOperationException("Password must contain at least one digit.");
    }
}
