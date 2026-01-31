package dev.jetplugins.beardedtheme;

import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
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
 * and shows a notification if no active license is found. The theme still
 * loads (JetBrains policy requires themes to remain functional) but
 * a balloon notification reminds the user to subscribe.
 *
 * Product code: PBEARDEDTHEME (matches plugin.xml product-descriptor)
 */
public class BeardedThemeLicenseCheck implements ProjectActivity {

    private static final Logger LOG = Logger.getInstance(BeardedThemeLicenseCheck.class);
    private static final String PRODUCT_CODE = "PBEARDEDTHEME";
    private static final String NOTIFICATION_GROUP = "Bearded Theme";

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

        String stamp = licensingFacade.getConfirmationStamp(PRODUCT_CODE);
        boolean isLicensed = stamp != null;

        if (isLicensed) {
            LOG.info("Bearded Theme: Active subscription found");
        } else {
            LOG.warn("Bearded Theme: No active subscription found.");
            NotificationGroupManager.getInstance()
                .getNotificationGroup(NOTIFICATION_GROUP)
                .createNotification(
                    "Bearded Theme — unlicensed",
                    "Your Bearded Theme subscription is not active. " +
                    "The theme will continue to work, but please consider " +
                    "<a href=\"https://plugins.jetbrains.com\">subscribing ($1/month)</a> " +
                    "to support development.",
                    NotificationType.WARNING)
                .setImportant(true)
                .notify(project);
        }
    }
}
