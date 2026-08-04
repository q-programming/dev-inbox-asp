namespace DevInbox.Web.Features.Audit.Domain;

public enum AuditEventType
{
    UserCreated,
    UserAuthenticated,
    AuthenticationFailed,
    UserLoggedOut,
    SessionExpired,
    GithubCredentialUpdated,
    AdoCredentialUpdated,
    UserSettingsUpdated,
    ManualSyncTriggered,
    ApplicationStarted
}
