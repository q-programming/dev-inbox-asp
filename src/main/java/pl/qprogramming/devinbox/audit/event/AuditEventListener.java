package pl.qprogramming.devinbox.audit.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;
import pl.qprogramming.devinbox.audit.service.AuditService;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;
import pl.qprogramming.devinbox.shared.utils.EmailUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditEventListener {
    private final AuditService auditService;

    @EventListener
    public void onApplicationStarted(ApplicationReadyEvent event) {
        log.debug("Dev Inbox app started in {}ms and Audit Event Listener ready", event.getTimestamp());
        auditService.record(AuditEntry.of(AuditEventType.APPLICATION_STARTED));
    }

    @ApplicationModuleListener
    public void onUserAuthenticated(UserAuthenticated event) {
        log.debug("[onUserAuthenticated] {}", event);
        auditService.record(AuditEntry.of(event.id(), AuditEventType.USER_AUTHENTICATED));
    }

    @ApplicationModuleListener
    public void onUserCreated(UserCreated event) {
        val details = "%s %s (%s) - %s".formatted(event.firstName(), event.lastName(), EmailUtils.maskEmail(event.email()), event.accountType());
        log.debug("[onUserCreated] {}", details);
        auditService.record(AuditEntry.of(event.id(), AuditEventType.USER_CREATED, event.accountType()));
    }

    @ApplicationModuleListener
    public void onFailedAuthentication(AuthenticationFailure event) {
        val details = "%s - %s".formatted(EmailUtils.maskEmail(event.email()), event.cause());
        log.debug("[onFailedAuthentication] {}", details);
        auditService.record(AuditEntry.of(event.id(), AuditEventType.AUTHENTICATION_FAILED, event.cause()));
    }
}
