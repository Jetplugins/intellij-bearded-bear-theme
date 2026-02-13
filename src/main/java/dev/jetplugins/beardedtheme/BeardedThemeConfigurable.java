package dev.jetplugins.beardedtheme;

import com.intellij.openapi.options.Configurable;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.util.ui.FormBuilder;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;

public final class BeardedThemeConfigurable implements Configurable {

    private JBCheckBox iconsCheckBox;

    @Nls(capitalization = Nls.Capitalization.Title)
    @Override
    public String getDisplayName() {
        return "Bearded Theme";
    }

    @Override
    public @Nullable JComponent createComponent() {
        iconsCheckBox = new JBCheckBox("Enable Bearded file icons");
        return FormBuilder.createFormBuilder()
                .addComponent(iconsCheckBox)
                .addComponentFillVertically(new JPanel(), 0)
                .getPanel();
    }

    @Override
    public boolean isModified() {
        return iconsCheckBox.isSelected() != BeardedThemeSettings.getInstance().isIconsEnabled();
    }

    @Override
    public void apply() {
        BeardedThemeSettings.getInstance().setIconsEnabled(iconsCheckBox.isSelected());
    }

    @Override
    public void reset() {
        iconsCheckBox.setSelected(BeardedThemeSettings.getInstance().isIconsEnabled());
    }

    @Override
    public void disposeUIResources() {
        iconsCheckBox = null;
    }
}
