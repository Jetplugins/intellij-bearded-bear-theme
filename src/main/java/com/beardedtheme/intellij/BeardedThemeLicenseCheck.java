package com.beardedtheme.intellij;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.ProjectActivity;
import com.intellij.ui.LicensingFacade;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Validates the Bearded Theme subscription license on project open.
 *
 * JetBrains Marketplace handles the subscription flow ($1/month).
 * This activity checks the license state via the LicensingFacade API
 * and logs a warning if no active license is found. The theme still
 * loads (JetBrains policy requires themes to remain functional) but
 * a notification reminds the user to subscribe.
 *
 * Product code: PBEARDEDTHEME (matches plugin.xml product-descriptor)
 */
public class BeardedThemeLicenseCheck implements ProjectActivity {

    private static final Logger LOG = Logger.getInstance(BeardedThemeLicenseCheck.class);
    private static final String PRODUCT_CODE = "PBEARDEDTHEME";

    @Nullable
    @Override
    public Object execute(@NotNull Project project, @NotNull Continuation<? super Unit> continuation) {
        ApplicationManager.getApplication().invokeLater(() -> checkLicense(project));
        return Unit.INSTANCE;
    }

    private void checkLicense(@NotNull Project project) {
        LicensingFacade licensingFacade = LicensingFacade.getInstance();
        if (licensingFacade == null) {
            LOG.info("Bearded Theme: LicensingFacade not available (community edition or test environment)");
            return;
        }

        String licensedVersion = licensingFacade.getLicensedVersion(PRODUCT_CODE);
        boolean isLicensed = licensedVersion != null;

        if (isLicensed) {
            LOG.info("Bearded Theme: Active subscription found (version: " + licensedVersion + ")");
        } else {
            LOG.warn("Bearded Theme: No active subscription found. " +
                     "Please subscribe at https://plugins.jetbrains.com to support development. " +
                     "The theme will continue to work, but consider supporting the creator.");
        }
    }
}
