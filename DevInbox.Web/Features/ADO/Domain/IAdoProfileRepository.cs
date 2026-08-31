namespace DevInbox.Web.Features.ADO.Domain;

public interface IAdoProfileRepository : IRepository<AdoProfile>
{
    Task<AdoProfile?> GetByUserIdAsync(long userId);

    Task DeleteByUserIdAsync(long userId);
}
