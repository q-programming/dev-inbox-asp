package pl.qprogramming.devinbox.audit.event;

import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pl.qprogramming.devinbox.AbstractIntegrationTest;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;
import pl.qprogramming.devinbox.audit.repository.AuditRepository;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Integration tests for {@link AuditEventListener}.
 *
 * <p>Events are published inside a {@link TransactionTemplate} so that
 * {@code @ApplicationModuleListener} (which is a {@code @TransactionalEventListener(AFTER_COMMIT)})
 * actually fires. Awaitility is used to accommodate the asynchronous listener execution.
 */
class AuditEventListenerIT extends AbstractIntegrationTest {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private AuditRepository auditRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate txTemplate;

    @BeforeEach
    void setUp() {
        auditRepository.deleteAll();
        txTemplate = new TransactionTemplate(transactionManager);
    }

    // ── UserCreated ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("UserCreated event")
    class OnUserCreated {

        @Test
        @DisplayName("Should persist USER_CREATED audit entry with userId and accountType as details")
        void shouldPersistAuditEntryOnUserCreated() {
            txTemplate.executeWithoutResult(status ->
                    eventPublisher.publishEvent(
                            new UserCreated(42L, "jane@example.com", "Jane", "Doe", "REGULAR", null)));

            await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
                List<AuditEntry> entries = auditRepository.findByEventType(AuditEventType.USER_CREATED);
                assertThat(entries).hasSize(1);
                val entry = entries.getFirst();
                assertThat(entry.getUserId()).isEqualTo(42L);
                assertThat(entry.getDetails()).isEqualTo("REGULAR");
                assertThat(entry.getOccurredAt()).isNotNull();
            });
        }

        @Test
        @DisplayName("Should record OAUTH_GITHUB accountType in details for OAuth users")
        void shouldRecordOAuthAccountTypeInDetails() {
            txTemplate.executeWithoutResult(status ->
                    eventPublisher.publishEvent(
                            new UserCreated(7L, "gh@example.com", "GH", "User", "OAUTH_GITHUB", "encrypted-token")));

            await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
                List<AuditEntry> entries = auditRepository.findByEventType(AuditEventType.USER_CREATED);
                assertThat(entries).hasSize(1);
                assertThat(entries.getFirst().getDetails()).isEqualTo("OAUTH_GITHUB");
            });
        }
    }

    // ── UserAuthenticated ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("UserAuthenticated event")
    class OnUserAuthenticated {

        @Test
        @DisplayName("Should persist USER_AUTHENTICATED audit entry with correct userId")
        void shouldPersistAuditEntryOnUserAuthenticated() {
            txTemplate.executeWithoutResult(status ->
                    eventPublisher.publishEvent(
                            new UserAuthenticated(99L, "auth@example.com", "encrypted-token")));

            await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
                List<AuditEntry> entries = auditRepository.findByEventType(AuditEventType.USER_AUTHENTICATED);
                assertThat(entries).hasSize(1);
                val entry = entries.getFirst();
                assertThat(entry.getUserId()).isEqualTo(99L);
                assertThat(entry.getDetails()).isNull();
                assertThat(entry.getOccurredAt()).isNotNull();
            });
        }
    }

    // ── AuthenticationFailure ─────────────────────────────────────────────────

    @Nested
    @DisplayName("AuthenticationFailure event")
    class OnAuthenticationFailure {

        @Test
        @DisplayName("Should persist AUTHENTICATION_FAILED audit entry with cause as details")
        void shouldPersistAuditEntryOnAuthFailure() {
            txTemplate.executeWithoutResult(status ->
                    eventPublisher.publishEvent(
                            new AuthenticationFailure(5L, "bad@example.com", "Bad credentials")));

            await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
                List<AuditEntry> entries = auditRepository.findByEventType(AuditEventType.AUTHENTICATION_FAILED);
                assertThat(entries).hasSize(1);
                val entry = entries.getFirst();
                assertThat(entry.getUserId()).isEqualTo(5L);
                assertThat(entry.getDetails()).isEqualTo("Bad credentials");
                assertThat(entry.getOccurredAt()).isNotNull();
            });
        }
    }

    // ── multiple events ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("Multiple events in one transaction")
    class MultipleEvents {

        @Test
        @DisplayName("Should persist separate audit entries for each event in one transaction")
        void shouldHandleMultipleEventsInOneTransaction() {
            txTemplate.executeWithoutResult(status -> {
                eventPublisher.publishEvent(new UserCreated(1L, "a@example.com", "A", "User", "REGULAR", null));
                eventPublisher.publishEvent(new UserCreated(2L, "b@example.com", "B", "User", "OAUTH_GITHUB", null));
            });

            await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                    assertThat(auditRepository.findByEventType(AuditEventType.USER_CREATED)).hasSize(2));
        }
    }
}
