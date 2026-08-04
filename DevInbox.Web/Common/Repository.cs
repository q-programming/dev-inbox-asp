using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Common;

public abstract class Repository<T>(AppDbContext? context) : IRepository<T> where T : class
{
    protected readonly AppDbContext Context = context ?? throw new ArgumentNullException(nameof(context));
    protected DbSet<T> Set => Context.Set<T>();

    public virtual async Task<T> GetByIdAsync(long id)
    {
        return await Set.FindAsync(id)
        ?? throw new KeyNotFoundException($"{typeof(T).Name} {id} not found");
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await Set.ToListAsync();
    }

    public virtual async Task AddAsync(T entity)
    {
        await Set.AddAsync(entity);
        await Context.SaveChangesAsync();
    }

    public virtual async Task UpdateAsync(T entity)
    {
        Set.Update(entity);
        await Context.SaveChangesAsync();
    }

    public virtual async Task DeleteAsync(T entity)
    {
        Set.Remove(entity);
        await Context.SaveChangesAsync();
    }
}