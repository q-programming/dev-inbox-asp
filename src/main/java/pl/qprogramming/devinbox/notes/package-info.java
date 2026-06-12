/**
 * Notes module — personal notes CRUD, note-to-item linking.
 * Publishes domain events consumed by the inbox module.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared", "identity"})
package pl.qprogramming.devinbox.notes;
