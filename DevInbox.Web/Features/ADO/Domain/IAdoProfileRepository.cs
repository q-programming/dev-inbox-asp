namespace DevInbox.Web.Features.ADO.Domain;

public interface IAdoProfileRepository : IRepository<AdoProfile>
{
    /// <summary>Every organization connection the given user has — zero, one, or many (see <see cref="AdoProfile"/>).</summary>
    Task<IReadOnlyList<AdoProfile>> GetAllByUserIdAsync(long userId);

    Task<AdoProfile?> GetByUserIdAndOrganizationAsync(long userId, string organization);

    /// <summary>Disconnects a single organization — the caller (event handler) is responsible for
    /// also removing that organization's inbox items, this only removes the profile/PAT row itself.</summary>
    Task DeleteByUserIdAndOrganizationAsync(long userId, string organization);
}
