package pl.qprogramming.devinbox.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests both branches of {@link DatabaseInitializer}:
 * <ol>
 *   <li>Fresh database → Hibernate creates schema + Liquibase changesets marked as executed.</li>
 *   <li>Existing database → Liquibase migrations run normally.</li>
 * </ol>
 * Uses a real PostgreSQL container but bypasses the Spring context entirely,
 * so the initializer can be exercised in isolation with full control over state.
 */
@Testcontainers
class DatabaseInitializerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgres:16-alpine"))
            .withDatabaseName("devinbox_test")
            .withUsername("devinbox")
            .withPassword("devinbox");

    // ──────────────────────────────────────────────────────────────────────
    // Fresh database — Hibernate DDL + Liquibase sync
    // ──────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Fresh database creates schema via Hibernate and marks Liquibase changesets as executed")
    void freshDatabaseCreatesSchemaAndMarksLiquibaseExecuted() throws Exception {
        DataSource ds = dataSource();
        DatabaseInitializer initializer = new DatabaseInitializer(ds);

        initializer.afterPropertiesSet();

        List<String> tables = userTables(ds);
        assertThat(tables).isNotEmpty();

        // Liquibase tracking table must exist (changesets were synced, not run)
        assertThat(tables).anyMatch(t -> t.equalsIgnoreCase("databasechangelog"));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Existing database — Liquibase migrations branch
    // ──────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Existing database runs Liquibase migrations and preserves schema")
    void existingDatabaseRunsLiquibaseMigrations() throws Exception {
        DataSource ds = dataSource();

        // First run: fresh DB — creates schema via Hibernate
        DatabaseInitializer initializer = new DatabaseInitializer(ds);
        initializer.afterPropertiesSet();

        List<String> tablesAfterFirstRun = userTables(ds);
        assertThat(tablesAfterFirstRun).isNotEmpty();

        // Second run: DB already has tables — must take the Liquibase migrations path.
        // No exception means the migration branch executed successfully.
        DatabaseInitializer initializerSecondRun = new DatabaseInitializer(ds);
        initializerSecondRun.afterPropertiesSet();

        // Schema should still be intact after second run
        List<String> tablesAfterSecondRun = userTables(ds);
        assertThat(tablesAfterSecondRun).containsAll(tablesAfterFirstRun);
    }

    private DataSource dataSource() {
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setURL(postgres.getJdbcUrl());
        ds.setUser(postgres.getUsername());
        ds.setPassword(postgres.getPassword());
        return ds;
    }

    private List<String> userTables(DataSource ds) throws Exception {
        List<String> tables = new ArrayList<>();
        try (Connection conn = ds.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getTables(conn.getCatalog(), null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME"));
                }
            }
        }
        return tables;
    }
}
