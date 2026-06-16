package pl.qprogramming.devinbox.audit.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "audit_entries")
public class AuditEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 100)
    private AuditEventType eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "details", length = 1000)
    private String details;

    public static AuditEntry of(AuditEventType eventType) {
        return new AuditEntry(null, null, eventType, Instant.now(), null);
    }

    public static AuditEntry of(Long userId, AuditEventType eventType) {
        return new AuditEntry(null, userId, eventType, Instant.now(), null);
    }

    public static AuditEntry of(Long userId, AuditEventType eventType, String details) {
        return new AuditEntry(null, userId, eventType, Instant.now(), details);
    }

}
