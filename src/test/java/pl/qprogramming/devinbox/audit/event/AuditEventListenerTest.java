package pl.qprogramming.devinbox.audit.event;

import lombok.val;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;
import pl.qprogramming.devinbox.audit.service.AuditService;
import pl.qprogramming.devinbox.identity.event.AuthenticationFailure;
import pl.qprogramming.devinbox.identity.event.UserAuthenticated;
import pl.qprogramming.devinbox.identity.event.UserCreated;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Unit tests for {@link AuditEventListener}.
 * Verifies that each domain event is translated to the correct {@link AuditEntry}
 * and persisted via {@link AuditService}.
 */
@ExtendWith(MockitoExtension.class)
class AuditEventListenerTest {

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuditEventListener listener;

    @Nested
    @DisplayName("onApplicationStarted")
    class OnApplicationStarted {

        @Test
        @DisplayName("Should record APPLICATION_STARTED entry with no userId")
        void shouldRecordApplicationStarted() {
            listener.onApplicationStarted(mock(ApplicationReadyEvent.class));

            ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
            verify(auditService).record(captor.capture());
            val entry = captor.getValue();
            assertThat(entry.getEventType()).isEqualTo(AuditEventType.APPLICATION_STARTED);
            assertThat(entry.getUserId()).isNull();
            assertThat(entry.getOccurredAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("onUserAuthenticated")
    class OnUserAuthenticated {

        @Test
        @DisplayName("Should record USER_AUTHENTICATED entry with correct userId")
        void shouldRecordUserAuthenticatedWithUserId() {
            val event = new UserAuthenticated(42L, "user@example.com", "encrypted-token");

            listener.onUserAuthenticated(event);

            ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
            verify(auditService).record(captor.capture());
            val entry = captor.getValue();
            assertThat(entry.getEventType()).isEqualTo(AuditEventType.USER_AUTHENTICATED);
            assertThat(entry.getUserId()).isEqualTo(42L);
            assertThat(entry.getOccurredAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("onUserCreated")
    class OnUserCreated {

        @Test
        @DisplayName("Should record USER_CREATED entry with accountType as details")
        void shouldRecordUserCreatedWithAccountTypeDetails() {
            val event = new UserCreated(7L, "new@example.com", "Jane", "Doe", "REGULAR", null);

            listener.onUserCreated(event);

            ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
            verify(auditService).record(captor.capture());
            val entry = captor.getValue();
            assertThat(entry.getEventType()).isEqualTo(AuditEventType.USER_CREATED);
            assertThat(entry.getUserId()).isEqualTo(7L);
            assertThat(entry.getDetails()).isEqualTo("REGULAR");
        }

        @Test
        @DisplayName("Should mask email in log — no PII in AuditEntry details")
        void shouldNotStorePlainEmailInDetails() {
            val event = new UserCreated(7L, "jane@example.com", "Jane", "Doe", "OAUTH_GITHUB", null);

            listener.onUserCreated(event);

            ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
            verify(auditService).record(captor.capture());
            // details contains only accountType; full email must not appear
            assertThat(captor.getValue().getDetails()).doesNotContain("jane@example.com");
        }
    }

    @Nested
    @DisplayName("onFailedAuthentication")
    class OnFailedAuthentication {

        @Test
        @DisplayName("Should record AUTHENTICATION_FAILED entry with cause as details")
        void shouldRecordAuthFailedWithCause() {
            val event = new AuthenticationFailure(99L, "bad@example.com", "Bad credentials");

            listener.onFailedAuthentication(event);

            ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
            verify(auditService).record(captor.capture());
            val entry = captor.getValue();
            assertThat(entry.getEventType()).isEqualTo(AuditEventType.AUTHENTICATION_FAILED);
            assertThat(entry.getUserId()).isEqualTo(99L);
            assertThat(entry.getDetails()).isEqualTo("Bad credentials");
        }
    }
}
