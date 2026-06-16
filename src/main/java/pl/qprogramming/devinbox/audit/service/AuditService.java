package pl.qprogramming.devinbox.audit.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.qprogramming.devinbox.audit.domain.AuditEntry;
import pl.qprogramming.devinbox.audit.repository.AuditRepository;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditRepository auditRepository;

    @Transactional
    public void record(AuditEntry auditEntry) {
        auditRepository.save(auditEntry);
    }

}
