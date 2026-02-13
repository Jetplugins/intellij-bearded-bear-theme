package dev.jetplugins.beardedtheme;

import com.intellij.ide.IconProvider;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.util.IconLoader;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiDirectory;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Provides Bearded-style file icons for the project tree.
 * Maps file extensions and special file names to themed SVG icons.
 */
public class BeardedIconProvider extends IconProvider implements DumbAware {

    private static final String ICON_PATH = "/icons/";

    private static final Map<String, String> EXTENSION_MAP = new HashMap<>();
    private static final Map<String, String> FILENAME_MAP = new HashMap<>();
    private static final Map<String, String> FOLDER_MAP = new HashMap<>();

    static {
        // Programming languages
        EXTENSION_MAP.put("java", "java");
        EXTENSION_MAP.put("kt", "kotlin");
        EXTENSION_MAP.put("kts", "kotlin");
        EXTENSION_MAP.put("py", "python");
        EXTENSION_MAP.put("pyw", "python");
        EXTENSION_MAP.put("js", "javascript");
        EXTENSION_MAP.put("mjs", "javascript");
        EXTENSION_MAP.put("cjs", "javascript");
        EXTENSION_MAP.put("jsx", "react");
        EXTENSION_MAP.put("ts", "typescript");
        EXTENSION_MAP.put("tsx", "react_ts");
        EXTENSION_MAP.put("go", "go");
        EXTENSION_MAP.put("rs", "rust");
        EXTENSION_MAP.put("rb", "ruby");
        EXTENSION_MAP.put("php", "php");
        EXTENSION_MAP.put("cs", "csharp");
        EXTENSION_MAP.put("cpp", "cpp");
        EXTENSION_MAP.put("cc", "cpp");
        EXTENSION_MAP.put("cxx", "cpp");
        EXTENSION_MAP.put("c", "c");
        EXTENSION_MAP.put("h", "c_header");
        EXTENSION_MAP.put("hpp", "cpp_header");
        EXTENSION_MAP.put("swift", "swift");
        EXTENSION_MAP.put("scala", "scala");
        EXTENSION_MAP.put("clj", "clojure");
        EXTENSION_MAP.put("ex", "elixir");
        EXTENSION_MAP.put("exs", "elixir");
        EXTENSION_MAP.put("erl", "erlang");
        EXTENSION_MAP.put("hs", "haskell");
        EXTENSION_MAP.put("lua", "lua");
        EXTENSION_MAP.put("r", "r");
        EXTENSION_MAP.put("dart", "dart");
        EXTENSION_MAP.put("vue", "vue");
        EXTENSION_MAP.put("svelte", "svelte");

        // Markup / Config
        EXTENSION_MAP.put("html", "html");
        EXTENSION_MAP.put("htm", "html");
        EXTENSION_MAP.put("css", "css");
        EXTENSION_MAP.put("scss", "sass");
        EXTENSION_MAP.put("sass", "sass");
        EXTENSION_MAP.put("less", "less");
        EXTENSION_MAP.put("styl", "stylus");
        EXTENSION_MAP.put("xml", "xml");
        EXTENSION_MAP.put("svg", "svg");
        EXTENSION_MAP.put("json", "json");
        EXTENSION_MAP.put("json5", "json");
        EXTENSION_MAP.put("yaml", "yaml");
        EXTENSION_MAP.put("yml", "yaml");
        EXTENSION_MAP.put("toml", "toml");
        EXTENSION_MAP.put("ini", "settings");
        EXTENSION_MAP.put("cfg", "settings");
        EXTENSION_MAP.put("conf", "settings");
        EXTENSION_MAP.put("properties", "settings");

        // Documentation
        EXTENSION_MAP.put("md", "markdown");
        EXTENSION_MAP.put("mdx", "markdown");
        EXTENSION_MAP.put("txt", "text");
        EXTENSION_MAP.put("rst", "text");
        EXTENSION_MAP.put("tex", "tex");
        EXTENSION_MAP.put("pdf", "pdf");

        // Shell / Scripts
        EXTENSION_MAP.put("sh", "shell");
        EXTENSION_MAP.put("bash", "shell");
        EXTENSION_MAP.put("zsh", "shell");
        EXTENSION_MAP.put("fish", "shell");
        EXTENSION_MAP.put("bat", "shell");
        EXTENSION_MAP.put("cmd", "shell");
        EXTENSION_MAP.put("ps1", "powershell");

        // Data
        EXTENSION_MAP.put("sql", "database");
        EXTENSION_MAP.put("db", "database");
        EXTENSION_MAP.put("sqlite", "database");
        EXTENSION_MAP.put("csv", "csv");
        EXTENSION_MAP.put("tsv", "csv");
        EXTENSION_MAP.put("graphql", "graphql");
        EXTENSION_MAP.put("gql", "graphql");
        EXTENSION_MAP.put("proto", "protobuf");

        // Build / Config files
        EXTENSION_MAP.put("gradle", "gradle");
        EXTENSION_MAP.put("groovy", "groovy");
        EXTENSION_MAP.put("tf", "terraform");
        EXTENSION_MAP.put("hcl", "terraform");

        // Images
        EXTENSION_MAP.put("png", "image");
        EXTENSION_MAP.put("jpg", "image");
        EXTENSION_MAP.put("jpeg", "image");
        EXTENSION_MAP.put("gif", "image");
        EXTENSION_MAP.put("ico", "image");
        EXTENSION_MAP.put("webp", "image");
        EXTENSION_MAP.put("bmp", "image");

        // Archives
        EXTENSION_MAP.put("zip", "archive");
        EXTENSION_MAP.put("tar", "archive");
        EXTENSION_MAP.put("gz", "archive");
        EXTENSION_MAP.put("rar", "archive");
        EXTENSION_MAP.put("7z", "archive");
        EXTENSION_MAP.put("jar", "archive");

        // Docker
        EXTENSION_MAP.put("dockerfile", "docker");

        // Lock files
        EXTENSION_MAP.put("lock", "lock");

        // Certificates
        EXTENSION_MAP.put("pem", "key");
        EXTENSION_MAP.put("key", "key");
        EXTENSION_MAP.put("cert", "key");
        EXTENSION_MAP.put("crt", "key");

        // Notebooks
        EXTENSION_MAP.put("ipynb", "jupyter");

        // Specific file names
        FILENAME_MAP.put("dockerfile", "docker");
        FILENAME_MAP.put("docker-compose.yml", "docker");
        FILENAME_MAP.put("docker-compose.yaml", "docker");
        FILENAME_MAP.put(".dockerignore", "docker");
        FILENAME_MAP.put("package.json", "nodejs");
        FILENAME_MAP.put("package-lock.json", "nodejs");
        FILENAME_MAP.put("tsconfig.json", "typescript");
        FILENAME_MAP.put("jsconfig.json", "javascript");
        FILENAME_MAP.put(".gitignore", "git");
        FILENAME_MAP.put(".gitattributes", "git");
        FILENAME_MAP.put(".gitmodules", "git");
        FILENAME_MAP.put(".editorconfig", "editorconfig");
        FILENAME_MAP.put(".prettierrc", "prettier");
        FILENAME_MAP.put(".prettierrc.json", "prettier");
        FILENAME_MAP.put(".prettierrc.yml", "prettier");
        FILENAME_MAP.put(".prettierignore", "prettier");
        FILENAME_MAP.put(".eslintrc", "eslint");
        FILENAME_MAP.put(".eslintrc.js", "eslint");
        FILENAME_MAP.put(".eslintrc.json", "eslint");
        FILENAME_MAP.put(".eslintignore", "eslint");
        FILENAME_MAP.put("eslint.config.js", "eslint");
        FILENAME_MAP.put("eslint.config.mjs", "eslint");
        FILENAME_MAP.put("webpack.config.js", "webpack");
        FILENAME_MAP.put("vite.config.ts", "vite");
        FILENAME_MAP.put("vite.config.js", "vite");
        FILENAME_MAP.put("rollup.config.js", "rollup");
        FILENAME_MAP.put("babel.config.js", "babel");
        FILENAME_MAP.put(".babelrc", "babel");
        FILENAME_MAP.put("jest.config.js", "jest");
        FILENAME_MAP.put("jest.config.ts", "jest");
        FILENAME_MAP.put("vitest.config.ts", "vitest");
        FILENAME_MAP.put("build.gradle", "gradle");
        FILENAME_MAP.put("build.gradle.kts", "gradle");
        FILENAME_MAP.put("settings.gradle", "gradle");
        FILENAME_MAP.put("settings.gradle.kts", "gradle");
        FILENAME_MAP.put("pom.xml", "maven");
        FILENAME_MAP.put("makefile", "makefile");
        FILENAME_MAP.put("Makefile", "makefile");
        FILENAME_MAP.put("CMakeLists.txt", "cmake");
        FILENAME_MAP.put("LICENSE", "license");
        FILENAME_MAP.put("LICENSE.md", "license");
        FILENAME_MAP.put("CHANGELOG.md", "changelog");
        FILENAME_MAP.put("README.md", "readme");
        FILENAME_MAP.put(".env", "env");
        FILENAME_MAP.put(".env.local", "env");
        FILENAME_MAP.put(".env.development", "env");
        FILENAME_MAP.put(".env.production", "env");
        FILENAME_MAP.put("go.mod", "go");
        FILENAME_MAP.put("go.sum", "go");
        FILENAME_MAP.put("Cargo.toml", "rust");
        FILENAME_MAP.put("Cargo.lock", "rust");
        FILENAME_MAP.put("Gemfile", "ruby");
        FILENAME_MAP.put("Rakefile", "ruby");
        FILENAME_MAP.put("requirements.txt", "python");
        FILENAME_MAP.put("setup.py", "python");
        FILENAME_MAP.put("pyproject.toml", "python");
        FILENAME_MAP.put("Pipfile", "python");
        FILENAME_MAP.put("nginx.conf", "nginx");
        FILENAME_MAP.put(".npmrc", "npm");
        FILENAME_MAP.put(".nvmrc", "nodejs");
        FILENAME_MAP.put("yarn.lock", "yarn");
        FILENAME_MAP.put(".yarnrc", "yarn");
        FILENAME_MAP.put("pnpm-lock.yaml", "pnpm");

        // Folder names
        FOLDER_MAP.put("src", "folder_src");
        FOLDER_MAP.put("source", "folder_src");
        FOLDER_MAP.put("test", "folder_test");
        FOLDER_MAP.put("tests", "folder_test");
        FOLDER_MAP.put("__tests__", "folder_test");
        FOLDER_MAP.put("spec", "folder_test");
        FOLDER_MAP.put("node_modules", "folder_node");
        FOLDER_MAP.put(".git", "folder_git");
        FOLDER_MAP.put(".github", "folder_github");
        FOLDER_MAP.put(".vscode", "folder_vscode");
        FOLDER_MAP.put(".idea", "folder_idea");
        FOLDER_MAP.put("build", "folder_build");
        FOLDER_MAP.put("dist", "folder_build");
        FOLDER_MAP.put("out", "folder_build");
        FOLDER_MAP.put("target", "folder_build");
        FOLDER_MAP.put("public", "folder_public");
        FOLDER_MAP.put("static", "folder_public");
        FOLDER_MAP.put("assets", "folder_assets");
        FOLDER_MAP.put("images", "folder_images");
        FOLDER_MAP.put("img", "folder_images");
        FOLDER_MAP.put("icons", "folder_images");
        FOLDER_MAP.put("fonts", "folder_fonts");
        FOLDER_MAP.put("styles", "folder_styles");
        FOLDER_MAP.put("css", "folder_styles");
        FOLDER_MAP.put("components", "folder_components");
        FOLDER_MAP.put("pages", "folder_pages");
        FOLDER_MAP.put("views", "folder_views");
        FOLDER_MAP.put("layouts", "folder_layouts");
        FOLDER_MAP.put("config", "folder_config");
        FOLDER_MAP.put("configs", "folder_config");
        FOLDER_MAP.put("lib", "folder_lib");
        FOLDER_MAP.put("libs", "folder_lib");
        FOLDER_MAP.put("vendor", "folder_lib");
        FOLDER_MAP.put("utils", "folder_utils");
        FOLDER_MAP.put("helpers", "folder_utils");
        FOLDER_MAP.put("hooks", "folder_hooks");
        FOLDER_MAP.put("api", "folder_api");
        FOLDER_MAP.put("routes", "folder_routes");
        FOLDER_MAP.put("middleware", "folder_middleware");
        FOLDER_MAP.put("models", "folder_models");
        FOLDER_MAP.put("controllers", "folder_controllers");
        FOLDER_MAP.put("services", "folder_services");
        FOLDER_MAP.put("types", "folder_types");
        FOLDER_MAP.put("interfaces", "folder_types");
        FOLDER_MAP.put("docs", "folder_docs");
        FOLDER_MAP.put("docker", "folder_docker");
        FOLDER_MAP.put("scripts", "folder_scripts");
        FOLDER_MAP.put("resources", "folder_resources");
        FOLDER_MAP.put("res", "folder_resources");
        FOLDER_MAP.put("i18n", "folder_i18n");
        FOLDER_MAP.put("locales", "folder_i18n");
        FOLDER_MAP.put("lang", "folder_i18n");
        FOLDER_MAP.put("translations", "folder_i18n");
    }

    @Override
    public @Nullable Icon getIcon(@NotNull PsiElement element, int flags) {
        if (!BeardedThemeSettings.getInstance().isIconsEnabled()) {
            return null;
        }
        if (element instanceof PsiDirectory) {
            return getFolderIcon((PsiDirectory) element);
        }
        if (element instanceof PsiFile) {
            return getFileIcon((PsiFile) element);
        }
        return null;
    }

    private @Nullable Icon getFileIcon(@NotNull PsiFile file) {
        String fileName = file.getName().toLowerCase();

        // Check exact filename match first
        String iconName = FILENAME_MAP.get(fileName);
        if (iconName != null) {
            return loadIcon(iconName);
        }

        // Check original case filename
        iconName = FILENAME_MAP.get(file.getName());
        if (iconName != null) {
            return loadIcon(iconName);
        }

        // Check extension
        VirtualFile vFile = file.getVirtualFile();
        if (vFile != null) {
            String ext = vFile.getExtension();
            if (ext != null) {
                iconName = EXTENSION_MAP.get(ext.toLowerCase());
                if (iconName != null) {
                    return loadIcon(iconName);
                }
            }
        }

        return null;
    }

    private @Nullable Icon getFolderIcon(@NotNull PsiDirectory dir) {
        String dirName = dir.getName().toLowerCase();
        String iconName = FOLDER_MAP.get(dirName);
        if (iconName != null) {
            return loadIcon(iconName);
        }
        // Check original case
        iconName = FOLDER_MAP.get(dir.getName());
        if (iconName != null) {
            return loadIcon(iconName);
        }
        return null;
    }

    private @Nullable Icon loadIcon(@NotNull String name) {
        try {
            return IconLoader.getIcon(ICON_PATH + name + ".svg", BeardedIconProvider.class);
        } catch (Exception e) {
            return null;
        }
    }
}
