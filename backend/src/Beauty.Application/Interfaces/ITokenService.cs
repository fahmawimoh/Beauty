using Beauty.Domain.Entities;

namespace Beauty.Application.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user, Guid? branchId = null);
}
