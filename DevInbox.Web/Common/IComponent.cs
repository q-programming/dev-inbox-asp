namespace DevInbox.Web.Common;

/// <summary>
/// Marker interface for controller delegate implementations.
/// Any class implementing this is automatically registered in DI as scoped
/// via Scrutor assembly scanning — no manual registration needed.
/// </summary>
public interface IComponent;
