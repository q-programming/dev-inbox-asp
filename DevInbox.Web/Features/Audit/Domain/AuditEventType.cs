namespace DevInbox.Web.Features.Audit.Domain;

public enum AuditEventType
{
    UserCreated,
    UserAuthenticated,
    AuthenticationFailed,
    UserLoggedOut,
    UserRemoved,
    UserRemovalFailed,
    SessionExpired,
    GithubCredentialUpdated,
    AdoCredentialUpdated,
    UserSettingsUpdated,
    ManualSyncTriggered,
    ApplicationStarted
}
