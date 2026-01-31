package dev.jetplugins.beardedtheme;

import org.junit.Test;

import java.io.InputStream;
import java.nio.file.*;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

/**
 * Validates that all icons referenced by BeardedIconProvider exist as SVG
 * resources and contain valid SVG markup.
 */
public class IconProviderTest {

    private static final Path ICONS_DIR = Paths.get("src/main/resources/icons");

    @Test
    public void allIconSvgFilesExist() throws Exception {
        // Collect all icon names referenced in BeardedIconProvider
        Set<String> expectedIcons = new HashSet<>();

        // File extension icons
        expectedIcons.addAll(Arrays.asList(
            "java", "kotlin", "python", "javascript", "typescript", "react", "react_ts",
            "go", "rust", "ruby", "php", "csharp", "cpp", "c", "c_header", "cpp_header",
            "swift", "scala", "clojure", "elixir", "erlang", "haskell", "lua", "r",
            "dart", "vue", "svelte", "html", "css", "sass", "less", "stylus", "xml",
            "svg", "json", "yaml", "toml", "settings", "markdown", "text", "tex", "pdf",
            "shell", "powershell", "database", "csv", "graphql", "protobuf",
            "gradle", "groovy", "terraform", "docker", "git", "editorconfig",
            "prettier", "eslint", "webpack", "vite", "rollup", "babel", "jest", "vitest",
            "nodejs", "npm", "yarn", "pnpm", "nginx", "image", "archive", "lock", "key",
            "license", "changelog", "readme", "env", "jupyter", "maven", "makefile", "cmake"
        ));

        // Folder icons
        expectedIcons.addAll(Arrays.asList(
            "folder_src", "folder_test", "folder_node", "folder_git", "folder_github",
            "folder_vscode", "folder_idea", "folder_build", "folder_public", "folder_assets",
            "folder_images", "folder_fonts", "folder_styles", "folder_components",
            "folder_pages", "folder_views", "folder_layouts", "folder_config", "folder_lib",
            "folder_utils", "folder_hooks", "folder_api", "folder_routes", "folder_middleware",
            "folder_models", "folder_controllers", "folder_services", "folder_types",
            "folder_docs", "folder_docker", "folder_scripts", "folder_resources", "folder_i18n"
        ));

        for (String iconName : expectedIcons) {
            Path iconPath = ICONS_DIR.resolve(iconName + ".svg");
            assertThat(iconPath)
                .as("Icon SVG should exist: " + iconName + ".svg")
                .exists();
        }
    }

    @Test
    public void allIconsContainValidSvg() throws Exception {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(ICONS_DIR, "*.svg")) {
            for (Path svgFile : stream) {
                String content = new String(Files.readAllBytes(svgFile));
                assertThat(content)
                    .as("SVG file should contain valid markup: " + svgFile.getFileName())
                    .contains("<svg")
                    .contains("xmlns=\"http://www.w3.org/2000/svg\"")
                    .contains("</svg>");
                assertThat(content)
                    .as("SVG should have 16x16 viewBox: " + svgFile.getFileName())
                    .containsPattern("viewBox=\"0 0 16 16\"");
            }
        }
    }

    @Test
    public void allIconsAreReasonableSize() throws Exception {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(ICONS_DIR, "*.svg")) {
            for (Path svgFile : stream) {
                long size = Files.size(svgFile);
                assertThat(size)
                    .as("SVG file should be < 10KB: " + svgFile.getFileName())
                    .isLessThan(10240);
                assertThat(size)
                    .as("SVG file should be > 100 bytes: " + svgFile.getFileName())
                    .isGreaterThan(100);
            }
        }
    }
}
