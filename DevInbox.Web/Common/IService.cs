namespace DevInbox.Web.Common;

/// <summary>
/// Marker interface for application services.
/// Any class implementing this is automatically registered in DI as scoped
/// via Scrutor assembly scanning — no manual registration needed.
/// </summary>
public interface IService;
