/**
 * Sync module — scheduler triggering incremental sync jobs across integration modules.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared", "identity", "github", "ado"})
package pl.qprogramming.devinbox.sync;
