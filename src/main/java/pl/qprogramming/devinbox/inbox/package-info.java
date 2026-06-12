/**
 * Inbox module — read model (inbox projection), query service, REST endpoints for the frontend.
 * Listens to domain events from github, ado, and notes modules.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared", "identity"})
package pl.qprogramming.devinbox.inbox;
