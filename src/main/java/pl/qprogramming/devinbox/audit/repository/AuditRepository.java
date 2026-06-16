package pl.qprogramming.devinbox.audit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.domain.AuditEventType;

import java.util.List;
import java.util.UUID;

public interface AuditRepository extends JpaRepository<AuditEntry, UUID> {

    List<AuditEntry> findByEventType(AuditEventType eventType);

    List<AuditEntry> findByUserId(Long userId);
}
