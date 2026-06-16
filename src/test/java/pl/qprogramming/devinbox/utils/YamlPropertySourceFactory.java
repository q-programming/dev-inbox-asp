package pl.qprogramming.devinbox.utils;

import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PropertySourceFactory;

import java.util.Objects;
import java.util.Properties;

/**
 * Allows {@code @PropertySource} to load YAML files in non-Boot Spring test contexts.
 *
 * <p>Usage:
 * <pre>{@code
 *   @PropertySource(value = "classpath:application-test.yml",
 *                   factory = YamlPropertySourceFactory.class)
 * }</pre>
 */
public class YamlPropertySourceFactory implements PropertySourceFactory {

    @Override
    public PropertySource<?> createPropertySource(String name, EncodedResource resource) {
        YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
        factory.setResources(resource.getResource());
        Properties properties = Objects.requireNonNull(factory.getObject());
        return new PropertiesPropertySource(resource.getResource().getFilename(), properties);
    }
}
