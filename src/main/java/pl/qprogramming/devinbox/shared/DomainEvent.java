package pl.qprogramming.devinbox.shared;

import java.time.Instant;
import java.util.UUID;

/**
 * Base marker interface for all domain events published via Spring Modulith's
 * event publication registry (transactional outbox pattern).
 */
public interface DomainEvent {
    UUID eventId();
    Instant occurredAt();
}
