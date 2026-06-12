package pl.qprogramming.devinbox.shared.api;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pl.qprogramming.devinbox.shared.dto.HealthStatus;

@Component
public class HealthApiDelegateImpl implements HealthApiDelegate {
    @Override
    public ResponseEntity<HealthStatus> healthCheck() {
        return ResponseEntity.ok(new HealthStatus().status("UP"));
    }

    @Override
    public ResponseEntity<HealthStatus> healthCheckOk() {
        return ResponseEntity.ok(new HealthStatus().status("UP"));
    }
}
