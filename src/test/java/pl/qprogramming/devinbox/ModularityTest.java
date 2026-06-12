package pl.qprogramming.devinbox;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Spring Modulith structural tests.
 *
 * Verifies that:
 * - no module imports internal types from another module
 * - module dependency declarations (allowedDependencies) are respected
 * - the overall module structure matches the declared design
 *
 * Run with: ./mvnw test -Dtest=ModularityTest
 */
class ModularityTest {

    private static final ApplicationModules modules =
            ApplicationModules.of(DevInboxApplication.class);

    @Test
    @DisplayName("Module structure adheres to Spring Modulith boundaries")
    void moduleStructureIsValid() {
        modules.verify();
    }

    @Test
    @DisplayName("Module documentation is generated as PlantUML diagrams")
    void generateModuleDocumentation() {
        new Documenter(modules)
                .writeModulesAsPlantUml()
                .writeIndividualModulesAsPlantUml();
    }
}
