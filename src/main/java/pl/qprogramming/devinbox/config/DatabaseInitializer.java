package pl.qprogramming.devinbox.config;

import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.Database;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.Properties;

/**
 * Handles autonomous database initialisation.
 * <p>
 * Strategy:
 * <ul>
 *   <li>Fresh database → Hibernate generates the initial schema, then all Liquibase changesets are
 *       marked as already executed (so they won't be re-applied later).</li>
 *   <li>Existing database → Liquibase runs pending migrations normally.</li>
 * </ul>
 * Runs before the EntityManagerFactory is fully initialised ({@code @Order(MIN_VALUE)}).
 * <p>
 * Disable via {@code application.database-initializer.enabled=false} (e.g. in integration tests
 * that manage their own schema lifecycle).
 */
@Slf4j
@Component
@Order(Integer.MIN_VALUE)
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "application.database-initializer.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class DatabaseInitializer implements InitializingBean {

    private final DataSource dataSource;

    @Override
    public void afterPropertiesSet() throws Exception {
        if (isDatabaseEmpty()) {
            log.info("FRESH DATABASE DETECTED — creating initial schema via Hibernate");
            createSchemaWithHibernate();
            log.info("✓ Schema created");
            markAllLiquibaseChangesetsAsExecuted();
            log.info("✓ Liquibase changesets marked as executed");
        } else {
            log.info("EXISTING DATABASE DETECTED — running Liquibase migrations");
            runLiquibaseMigrations();
            log.info("✓ Liquibase migrations complete");
        }
    }

    private boolean isDatabaseEmpty() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            try (ResultSet tables = metaData.getTables(
                    connection.getCatalog(), null, "%", new String[]{"TABLE"})) {
                while (tables.next()) {
                    String tableName = tables.getString("TABLE_NAME");
                    if (!tableName.equalsIgnoreCase("DATABASECHANGELOG") &&
                        !tableName.equalsIgnoreCase("DATABASECHANGELOGLOCK")) {
                        log.debug("Found existing table: {}", tableName);
                        return false;
                    }
                }
            }
        }
        log.debug("No user tables found — fresh database");
        return true;
    }

    private void createSchemaWithHibernate() throws Exception {
        LocalContainerEntityManagerFactoryBean emfBean = new LocalContainerEntityManagerFactoryBean();
        emfBean.setDataSource(dataSource);
        emfBean.setPackagesToScan(
            "pl.qprogramming.devinbox",
            "org.springframework.modulith.events.jpa"  // event_publication table
        );
        emfBean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties jpaProperties = new Properties();
        jpaProperties.put("hibernate.hbm2ddl.auto", "create");
        jpaProperties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        jpaProperties.put("hibernate.physical_naming_strategy",
                "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");
        emfBean.setJpaProperties(jpaProperties);
        emfBean.afterPropertiesSet();

        if (emfBean.getObject() != null) {
            emfBean.getObject().close();
        }
        emfBean.destroy();
        log.info("✓ Hibernate DDL creation complete");
    }

    private void markAllLiquibaseChangesetsAsExecuted() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            Database database = DatabaseFactory.getInstance()
                    .findCorrectDatabaseImplementation(new JdbcConnection(connection));
            try (Liquibase liquibase = new Liquibase(
                    "config/liquibase/master.xml",
                    new ClassLoaderResourceAccessor(),
                    database)) {
                liquibase.changeLogSync(new Contexts(), new LabelExpression());
            }
        }
    }

    private void runLiquibaseMigrations() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            Database database = DatabaseFactory.getInstance()
                    .findCorrectDatabaseImplementation(new JdbcConnection(connection));
            try (Liquibase liquibase = new Liquibase(
                    "config/liquibase/master.xml",
                    new ClassLoaderResourceAccessor(),
                    database)) {
                liquibase.update(new Contexts(), new LabelExpression());
            }
        }
    }
}
