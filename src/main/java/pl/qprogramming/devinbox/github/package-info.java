/**
 * GitHub integration module — GitHub API client, PR import, mention import, incremental sync per user.
 * Publishes domain events consumed by the inbox module.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared", "identity"})
package pl.qprogramming.devinbox.github;
