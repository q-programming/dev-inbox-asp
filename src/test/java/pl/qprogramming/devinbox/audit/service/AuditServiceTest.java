package pl.qprogramming.devinbox.audit.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;
import pl.qprogramming.devinbox.audit.repository.AuditRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/**
 * Unit tests for {@link AuditService}.
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditRepository auditRepository;

    @InjectMocks
    private AuditService auditService;

    @Test
    @DisplayName("Should delegate to repository.save when recording an audit entry")
    void shouldSaveAuditEntryToRepository() {
        var entry = AuditEntry.of(AuditEventType.APPLICATION_STARTED);

        auditService.record(entry);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo(AuditEventType.APPLICATION_STARTED);
    }

    @Test
    @DisplayName("Should persist entry with userId when provided")
    void shouldSaveAuditEntryWithUserId() {
        var entry = AuditEntry.of(42L, AuditEventType.USER_CREATED);

        auditService.record(entry);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditRepository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(42L);
        assertThat(captor.getValue().getEventType()).isEqualTo(AuditEventType.USER_CREATED);
    }

    @Test
    @DisplayName("Should persist entry with details when provided")
    void shouldSaveAuditEntryWithDetails() {
        var entry = AuditEntry.of(1L, AuditEventType.AUTHENTICATION_FAILED, "Bad credentials");

        auditService.record(entry);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditRepository).save(captor.capture());
        assertThat(captor.getValue().getDetails()).isEqualTo("Bad credentials");
    }
}
