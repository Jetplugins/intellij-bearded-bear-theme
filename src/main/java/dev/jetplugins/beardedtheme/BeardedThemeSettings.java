package dev.jetplugins.beardedtheme;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import org.jetbrains.annotations.NotNull;

@State(name = "BeardedThemeSettings", storages = @Storage("bearded-theme.xml"))
public final class BeardedThemeSettings implements PersistentStateComponent<BeardedThemeSettings.State> {

    public static class State {
        public boolean iconsEnabled = true;
    }

    private State state = new State();

    public static BeardedThemeSettings getInstance() {
        return ApplicationManager.getApplication().getService(BeardedThemeSettings.class);
    }

    public boolean isIconsEnabled() {
        return state.iconsEnabled;
    }

    public void setIconsEnabled(boolean enabled) {
        state.iconsEnabled = enabled;
    }

    @Override
    public @NotNull State getState() {
        return state;
    }

    @Override
    public void loadState(@NotNull State state) {
        this.state = state;
    }
}
