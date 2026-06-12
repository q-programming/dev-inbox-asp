/**
 * Azure DevOps integration module — ADO API client, work item import, incremental sync per user.
 * Publishes domain events consumed by the inbox module.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared", "identity"})
package pl.qprogramming.devinbox.ado;
