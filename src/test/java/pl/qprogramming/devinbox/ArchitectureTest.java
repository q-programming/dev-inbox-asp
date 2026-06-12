package pl.qprogramming.devinbox;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * ArchUnit architecture enforcement tests.
 *
 * These rules supplement Spring Modulith's built-in boundary checks
 * with explicit, human-readable assertions that show up clearly in CI.
 */
class ArchitectureTest {

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("pl.qprogramming.devinbox");
    }

    @Test
    @DisplayName("Inbox module must not depend on GitHub internals")
    void inboxModuleMustNotDependOnGithubInternals() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..inbox..")
                .should().dependOnClassesThat()
                .resideInAPackage("..github.internal..");
        rule.check(classes);
    }

    @Test
    @DisplayName("Inbox module must not depend on ADO internals")
    void inboxModuleMustNotDependOnAdoInternals() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..inbox..")
                .should().dependOnClassesThat()
                .resideInAPackage("..ado.internal..");
        rule.check(classes);
    }

    @Test
    @DisplayName("Config classes must not depend on module internals")
    void configClassesMustNotDependOnModuleInternals() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..config..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(
                        "..github.internal..",
                        "..ado.internal..",
                        "..inbox.internal..",
                        "..notes.internal.."
                );
        rule.check(classes);
    }
}
