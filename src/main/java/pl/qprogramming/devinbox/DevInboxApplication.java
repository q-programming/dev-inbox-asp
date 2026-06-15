package pl.qprogramming.devinbox;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import pl.qprogramming.devinbox.config.ApplicationProperties;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties({ApplicationProperties.class})
public class DevInboxApplication {
    public static void main(String[] args) {
        SpringApplication.run(DevInboxApplication.class, args);
    }
}
