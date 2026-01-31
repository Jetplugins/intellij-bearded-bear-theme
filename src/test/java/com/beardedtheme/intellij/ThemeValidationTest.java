package com.beardedtheme.intellij;

import com.google.gson.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.*;

/**
 * Validates all generated Bearded Theme files for structural correctness
 * and generates color swatch screenshots for visual comparison testing.
 */
@RunWith(Parameterized.class)
public class ThemeValidationTest {

    private static final Path THEMES_DIR = Paths.get("src/main/resources/themes");
    private static final Path SCREENSHOTS_DIR = Paths.get("build/screenshots");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final String slug;
    private final String name;
    private final boolean dark;

    public ThemeValidationTest(String slug, String name, boolean dark) {
        this.slug = slug;
        this.name = name;
        this.dark = dark;
    }

    @Parameterized.Parameters(name = "{1}")
    public static Collection<Object[]> themes() throws Exception {
        Path listFile = THEMES_DIR.resolve("theme-list.json");
        String json = new String(Files.readAllBytes(listFile), StandardCharsets.UTF_8);
        JsonArray array = JsonParser.parseString(json).getAsJsonArray();
        List<Object[]> params = new ArrayList<>();
        for (JsonElement el : array) {
            JsonObject obj = el.getAsJsonObject();
            params.add(new Object[]{
                obj.get("slug").getAsString(),
                obj.get("name").getAsString(),
                obj.get("dark").getAsBoolean()
            });
        }
        return params;
    }

    @Test
    public void themeJsonIsValid() throws Exception {
        Path themeFile = THEMES_DIR.resolve(slug + ".theme.json");
        assertThat(themeFile).exists();

        String json = new String(Files.readAllBytes(themeFile), StandardCharsets.UTF_8);
        JsonObject theme = JsonParser.parseString(json).getAsJsonObject();

        // Verify required top-level fields
        assertThat(theme.has("name")).as("theme has 'name'").isTrue();
        assertThat(theme.has("dark")).as("theme has 'dark'").isTrue();
        assertThat(theme.has("author")).as("theme has 'author'").isTrue();
        assertThat(theme.has("editorScheme")).as("theme has 'editorScheme'").isTrue();
        assertThat(theme.has("ui")).as("theme has 'ui'").isTrue();
        assertThat(theme.has("icons")).as("theme has 'icons'").isTrue();

        // Verify dark/light flag
        assertThat(theme.get("dark").getAsBoolean()).isEqualTo(dark);

        // Verify name matches
        assertThat(theme.get("name").getAsString()).isEqualTo(name);

        // Verify editorScheme path references an existing file
        String schemePath = theme.get("editorScheme").getAsString();
        assertThat(schemePath).startsWith("/themes/");
        Path schemeFile = THEMES_DIR.resolve(schemePath.replace("/themes/", ""));
        assertThat(schemeFile).exists();

        // Verify UI section has required component keys
        JsonObject ui = theme.getAsJsonObject("ui");
        assertThat(ui.has("*")).as("ui has '*' defaults").isTrue();
        assertThat(ui.has("Editor")).as("ui has 'Editor'").isTrue();
        assertThat(ui.has("EditorTabs")).as("ui has 'EditorTabs'").isTrue();
        assertThat(ui.has("Tree")).as("ui has 'Tree'").isTrue();
        assertThat(ui.has("List")).as("ui has 'List'").isTrue();
        assertThat(ui.has("Button")).as("ui has 'Button'").isTrue();
        assertThat(ui.has("ToolWindow")).as("ui has 'ToolWindow'").isTrue();
        assertThat(ui.has("StatusBar")).as("ui has 'StatusBar'").isTrue();
        assertThat(ui.has("Popup")).as("ui has 'Popup'").isTrue();
        assertThat(ui.has("Menu")).as("ui has 'Menu'").isTrue();
        assertThat(ui.has("ProgressBar")).as("ui has 'ProgressBar'").isTrue();
        assertThat(ui.has("ScrollBar")).as("ui has 'ScrollBar'").isTrue();

        // Verify icon color palette
        JsonObject icons = theme.getAsJsonObject("icons");
        assertThat(icons.has("ColorPalette")).as("icons has 'ColorPalette'").isTrue();
    }

    @Test
    public void editorSchemeXmlIsValid() throws Exception {
        Path schemeFile = THEMES_DIR.resolve(slug + ".xml");
        assertThat(schemeFile).exists();

        String xml = new String(Files.readAllBytes(schemeFile), StandardCharsets.UTF_8);

        // Verify XML structure
        assertThat(xml).startsWith("<?xml");
        assertThat(xml).contains("<scheme name=\"" + name + "\"");
        assertThat(xml).contains("<colors>");
        assertThat(xml).contains("<attributes>");

        // Verify essential color options exist
        assertThat(xml).contains("CARET_COLOR");
        assertThat(xml).contains("CARET_ROW_COLOR");
        assertThat(xml).contains("SELECTION_BACKGROUND");
        assertThat(xml).contains("LINE_NUMBERS_COLOR");
        assertThat(xml).contains("GUTTER_BACKGROUND");
        assertThat(xml).contains("INDENT_GUIDE");

        // Verify essential attributes exist
        assertThat(xml).contains("DEFAULT_KEYWORD");
        assertThat(xml).contains("DEFAULT_STRING");
        assertThat(xml).contains("DEFAULT_NUMBER");
        assertThat(xml).contains("DEFAULT_FUNCTION_CALL");
        assertThat(xml).contains("DEFAULT_CLASS_NAME");
        assertThat(xml).contains("DEFAULT_BLOCK_COMMENT");
        assertThat(xml).contains("DEFAULT_LOCAL_VARIABLE");
        assertThat(xml).contains("DEFAULT_PARAMETER");

        // Verify parent scheme
        if (dark) {
            assertThat(xml).contains("parent_scheme=\"Darcula\"");
        } else {
            assertThat(xml).contains("parent_scheme=\"Default\"");
        }
    }

    @Test
    public void colorContrastMeetsMinimum() throws Exception {
        Path themeFile = THEMES_DIR.resolve(slug + ".theme.json");
        String json = new String(Files.readAllBytes(themeFile), StandardCharsets.UTF_8);
        JsonObject theme = JsonParser.parseString(json).getAsJsonObject();

        JsonObject defaults = theme.getAsJsonObject("ui").getAsJsonObject("*");
        String bgHex = defaults.get("background").getAsString();
        String fgHex = defaults.get("foreground").getAsString();

        double contrast = calculateContrastRatio(bgHex, fgHex);

        // WCAG AA requires 4.5:1 for normal text. We check for 3:1 minimum
        // since some artistic themes intentionally use lower contrast.
        assertThat(contrast)
            .as("Contrast ratio between background and foreground for " + name)
            .isGreaterThanOrEqualTo(3.0);
    }

    @Test
    public void generateScreenshot() throws Exception {
        Path themeFile = THEMES_DIR.resolve(slug + ".theme.json");
        String json = new String(Files.readAllBytes(themeFile), StandardCharsets.UTF_8);
        JsonObject theme = JsonParser.parseString(json).getAsJsonObject();

        // Extract colors for the screenshot
        JsonObject defaults = theme.getAsJsonObject("ui").getAsJsonObject("*");
        JsonObject editor = theme.getAsJsonObject("ui").getAsJsonObject("Editor");
        JsonObject tabs = theme.getAsJsonObject("ui").getAsJsonObject("EditorTabs");
        JsonObject statusBar = theme.getAsJsonObject("ui").getAsJsonObject("StatusBar");
        JsonObject tree = theme.getAsJsonObject("ui").getAsJsonObject("Tree");
        JsonObject toolWindow = theme.getAsJsonObject("ui").getAsJsonObject("ToolWindow");
        JsonObject progressBar = theme.getAsJsonObject("ui").getAsJsonObject("ProgressBar");
        JsonObject iconPalette = theme.getAsJsonObject("icons").getAsJsonObject("ColorPalette");

        // Read editor scheme for syntax colors
        Path schemeFile = THEMES_DIR.resolve(slug + ".xml");
        String xml = new String(Files.readAllBytes(schemeFile), StandardCharsets.UTF_8);

        // Generate a visual swatch image
        int width = 800;
        int height = 520;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);

        Color bgColor = parseColor(defaults.get("background").getAsString());
        Color fgColor = parseColor(defaults.get("foreground").getAsString());
        Color selColor = parseColor(defaults.get("selectionBackground").getAsString());
        Color separatorColor = parseColor(defaults.get("separatorColor").getAsString());
        Color accentColor = parseColor(progressBar.get("progressColor").getAsString());

        // Background
        g.setColor(bgColor);
        g.fillRect(0, 0, width, height);

        // Title bar area
        Color titleBg = parseColor(tabs.get("background").getAsString());
        g.setColor(titleBg);
        g.fillRect(0, 0, width, 32);
        g.setColor(fgColor);
        g.setFont(new Font("SansSerif", Font.BOLD, 13));
        g.drawString(name, 12, 22);

        // Sidebar
        Color sidebarBg = parseColor(getJsonString(toolWindow, "Header", "background", defaults.get("background").getAsString()));
        g.setColor(sidebarBg);
        g.fillRect(0, 32, 200, height - 32);

        // Sidebar separator
        g.setColor(separatorColor);
        g.fillRect(200, 32, 1, height - 32);

        // Sidebar tree items
        Color treeBg = parseColor(tree.get("background").getAsString());
        Color treeFg = parseColor(tree.get("foreground").getAsString());
        Color treeSel = parseColor(tree.get("selectionBackground").getAsString());
        g.setFont(new Font("SansSerif", Font.PLAIN, 12));

        String[] treeItems = {"src", "  main", "    java", "      App.java", "    resources", "      themes/", "  test", "    AppTest.java", "build.gradle", "README.md"};
        int treeY = 52;
        for (int i = 0; i < treeItems.length; i++) {
            if (i == 3) { // Highlight one item
                g.setColor(treeSel);
                g.fillRect(0, treeY - 12, 200, 20);
            }
            g.setColor(treeFg);
            g.drawString(treeItems[i], 12, treeY);
            treeY += 20;
        }

        // Editor area
        Color edBg = parseColor(editor.get("background").getAsString());
        g.setColor(edBg);
        g.fillRect(201, 32, width - 201, height - 62);

        // Tab bar
        Color tabBg = parseColor(tabs.get("background").getAsString());
        Color tabActiveBg = parseColor(tabs.get("underlinedTabBackground").getAsString());
        Color tabAccent = parseColor(tabs.get("underlineColor").getAsString());
        g.setColor(tabBg);
        g.fillRect(201, 32, width - 201, 28);
        g.setColor(tabActiveBg);
        g.fillRect(201, 32, 120, 28);
        g.setColor(tabAccent);
        g.fillRect(201, 57, 120, 3);
        g.setColor(fgColor);
        g.setFont(new Font("SansSerif", Font.PLAIN, 11));
        g.drawString("App.java", 215, 50);
        g.setColor(parseColor(defaults.get("disabledForeground").getAsString()));
        g.drawString("README.md", 335, 50);

        // Gutter line numbers
        g.setFont(new Font("Monospaced", Font.PLAIN, 11));
        Color gutterFg = new Color(fgColor.getRed(), fgColor.getGreen(), fgColor.getBlue(), 100);
        for (int line = 1; line <= 18; line++) {
            g.setColor(gutterFg);
            g.drawString(String.format("%3d", line), 210, 76 + (line - 1) * 17);
        }

        // Syntax highlighted code
        Map<String, Color> syntaxColors = extractSyntaxColors(xml);
        int codeX = 250;
        int codeY = 76;
        int lineH = 17;
        Font codeFont = new Font("Monospaced", Font.PLAIN, 12);
        Font codeBold = new Font("Monospaced", Font.BOLD, 12);
        Font codeItalic = new Font("Monospaced", Font.ITALIC, 12);
        g.setFont(codeFont);

        // Line 1: package declaration
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "package ");
        drawCode(g, -1, codeY, fgColor, codeFont, "com.example.app;");
        codeY += lineH;

        // Line 2: blank
        codeY += lineH;

        // Line 3: import
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "import ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "java.util.List");
        drawCode(g, -1, codeY, fgColor, codeFont, ";");
        codeY += lineH;

        // Line 4: import
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "import ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "java.util.stream.Collectors");
        drawCode(g, -1, codeY, fgColor, codeFont, ";");
        codeY += lineH;

        // Line 5: blank
        codeY += lineH;

        // Line 6: doc comment
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("comment", gutterFg), codeItalic, "/** Main application class */");
        codeY += lineH;

        // Line 7: annotation
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("annotation", fgColor), codeFont, "@SuppressWarnings");
        drawCode(g, -1, codeY, fgColor, codeFont, "(");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("string", fgColor), codeFont, "\"unchecked\"");
        drawCode(g, -1, codeY, fgColor, codeFont, ")");
        codeY += lineH;

        // Line 8: class declaration
        drawCode(g, codeX, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "public class ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeBold, "App");
        drawCode(g, -1, codeY, fgColor, codeFont, " {");
        codeY += lineH;

        // Line 9: constant
        drawCode(g, codeX + 20, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "private static final ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "String ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("constant", fgColor), codeBold, "VERSION");
        drawCode(g, -1, codeY, fgColor, codeFont, " = ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("string", fgColor), codeFont, "\"1.0.0\"");
        drawCode(g, -1, codeY, fgColor, codeFont, ";");
        codeY += lineH;

        // Line 10: field
        drawCode(g, codeX + 20, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "private ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "List");
        drawCode(g, -1, codeY, fgColor, codeFont, "<");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "String");
        drawCode(g, -1, codeY, fgColor, codeFont, "> ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("field", fgColor), codeFont, "items");
        drawCode(g, -1, codeY, fgColor, codeFont, ";");
        codeY += lineH;

        // Line 11: blank
        codeY += lineH;

        // Line 12: method
        drawCode(g, codeX + 20, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "public ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("type", fgColor), codeFont, "int ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "getCount");
        drawCode(g, -1, codeY, fgColor, codeFont, "(");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("class", fgColor), codeFont, "String ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("parameter", fgColor), codeFont, "filter");
        drawCode(g, -1, codeY, fgColor, codeFont, ") {");
        codeY += lineH;

        // Line 13: return
        drawCode(g, codeX + 40, codeY, syntaxColors.getOrDefault("keyword", fgColor), codeFont, "return ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("field", fgColor), codeFont, "items");
        drawCode(g, -1, codeY, fgColor, codeFont, ".");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "stream");
        drawCode(g, -1, codeY, fgColor, codeFont, "()");
        codeY += lineH;

        // Line 14: .filter
        drawCode(g, codeX + 60, codeY, fgColor, codeFont, ".");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "filter");
        drawCode(g, -1, codeY, fgColor, codeFont, "(");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("variable", fgColor), codeFont, "s");
        drawCode(g, -1, codeY, fgColor, codeFont, " -> ");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("variable", fgColor), codeFont, "s");
        drawCode(g, -1, codeY, fgColor, codeFont, ".");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "contains");
        drawCode(g, -1, codeY, fgColor, codeFont, "(");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("parameter", fgColor), codeFont, "filter");
        drawCode(g, -1, codeY, fgColor, codeFont, "))");
        codeY += lineH;

        // Line 15: .size
        drawCode(g, codeX + 60, codeY, fgColor, codeFont, ".");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "toList");
        drawCode(g, -1, codeY, fgColor, codeFont, "().");
        drawCode(g, -1, codeY, syntaxColors.getOrDefault("function", fgColor), codeFont, "size");
        drawCode(g, -1, codeY, fgColor, codeFont, "();");
        codeY += lineH;

        // Line 16: close method
        drawCode(g, codeX + 20, codeY, fgColor, codeFont, "}");
        codeY += lineH;

        // Line 17: close class
        drawCode(g, codeX, codeY, fgColor, codeFont, "}");

        // Status bar
        Color statusBg = parseColor(statusBar.get("background").getAsString());
        Color statusFg = parseColor(statusBar.get("foreground").getAsString());
        g.setColor(statusBg);
        g.fillRect(0, height - 28, width, 28);
        g.setColor(separatorColor);
        g.fillRect(0, height - 28, width, 1);
        g.setColor(statusFg);
        g.setFont(new Font("SansSerif", Font.PLAIN, 11));
        g.drawString("UTF-8  |  LF  |  Java 17  |  " + name, 12, height - 10);

        // Color palette swatch bar at bottom of sidebar
        Color[] paletteColors = {
            parseColorSafe(iconPalette, "Actions.Blue", "#4285f4"),
            parseColorSafe(iconPalette, "Actions.Green", "#34a853"),
            parseColorSafe(iconPalette, "Actions.Yellow", "#fbbc04"),
            parseColorSafe(iconPalette, "Actions.Red", "#ea4335"),
            parseColorSafe(iconPalette, "Objects.Purple", "#9c27b0"),
            parseColorSafe(iconPalette, "Objects.Pink", "#e91e63"),
        };
        int swatchY = height - 60;
        int swatchSize = 22;
        int swatchX = 14;
        g.setFont(new Font("SansSerif", Font.BOLD, 9));
        g.setColor(treeFg);
        g.drawString("Icon Palette", swatchX, swatchY - 6);
        for (Color c : paletteColors) {
            g.setColor(c);
            g.fillRoundRect(swatchX, swatchY, swatchSize, swatchSize, 4, 4);
            swatchX += swatchSize + 6;
        }

        g.dispose();

        // Write PNG
        Files.createDirectories(SCREENSHOTS_DIR);
        Path screenshotFile = SCREENSHOTS_DIR.resolve(slug + ".png");
        javax.imageio.ImageIO.write(image, "PNG", screenshotFile.toFile());

        // Verify screenshot was created
        assertThat(screenshotFile).exists();
        assertThat(Files.size(screenshotFile)).isGreaterThan(0);
    }

    // -----------------------------------------------------------------------
    // Helper methods
    // -----------------------------------------------------------------------

    private static int drawX = 0;

    private static void drawCode(Graphics2D g, int x, int y, Color color, Font font, String text) {
        if (x >= 0) drawX = x;
        g.setColor(color);
        g.setFont(font);
        g.drawString(text, drawX, y);
        drawX += g.getFontMetrics(font).stringWidth(text);
    }

    private static Map<String, Color> extractSyntaxColors(String xml) {
        Map<String, Color> colors = new HashMap<>();
        colors.put("keyword", extractForeground(xml, "DEFAULT_KEYWORD"));
        colors.put("string", extractForeground(xml, "DEFAULT_STRING"));
        colors.put("comment", extractForeground(xml, "DEFAULT_BLOCK_COMMENT"));
        colors.put("function", extractForeground(xml, "DEFAULT_FUNCTION_CALL"));
        colors.put("class", extractForeground(xml, "DEFAULT_CLASS_NAME"));
        colors.put("variable", extractForeground(xml, "DEFAULT_LOCAL_VARIABLE"));
        colors.put("parameter", extractForeground(xml, "DEFAULT_PARAMETER"));
        colors.put("constant", extractForeground(xml, "DEFAULT_CONSTANT"));
        colors.put("number", extractForeground(xml, "DEFAULT_NUMBER"));
        colors.put("annotation", extractForeground(xml, "DEFAULT_METADATA"));
        colors.put("field", extractForeground(xml, "DEFAULT_INSTANCE_FIELD"));
        colors.put("type", extractForeground(xml, "TYPE_PARAMETER_NAME_ATTRIBUTES"));
        return colors;
    }

    private static Color extractForeground(String xml, String attrName) {
        // Find the option block for this attribute name
        String marker = "name=\"" + attrName + "\"";
        int idx = xml.indexOf(marker);
        if (idx < 0) return Color.GRAY;

        // Find FOREGROUND value within the next ~300 chars
        String searchArea = xml.substring(idx, Math.min(idx + 400, xml.length()));
        String fgMarker = "name=\"FOREGROUND\" value=\"";
        int fgIdx = searchArea.indexOf(fgMarker);
        if (fgIdx < 0) return Color.GRAY;

        String hexValue = searchArea.substring(fgIdx + fgMarker.length(), fgIdx + fgMarker.length() + 6);
        return parseColor("#" + hexValue);
    }

    private static Color parseColor(String hex) {
        hex = hex.replace("#", "");
        if (hex.length() == 8) {
            // RGBA
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            int a = Integer.parseInt(hex.substring(6, 8), 16);
            return new Color(r, g, b, a);
        }
        if (hex.length() == 6) {
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            return new Color(r, g, b);
        }
        return Color.GRAY;
    }

    private static Color parseColorSafe(JsonObject obj, String key, String fallback) {
        try {
            if (obj.has(key)) return parseColor(obj.get(key).getAsString());
        } catch (Exception ignored) {}
        return parseColor(fallback);
    }

    private static String getJsonString(JsonObject obj, String... keys) {
        JsonObject current = obj;
        for (int i = 0; i < keys.length - 1; i++) {
            if (current.has(keys[i]) && current.get(keys[i]).isJsonObject()) {
                current = current.getAsJsonObject(keys[i]);
            } else {
                return keys[keys.length - 1];
            }
        }
        String lastKey = keys[keys.length - 1];
        return current.has(lastKey) ? current.get(lastKey).getAsString() : lastKey;
    }

    /**
     * Calculates WCAG contrast ratio between two colors.
     */
    private static double calculateContrastRatio(String hex1, String hex2) {
        double l1 = relativeLuminance(hex1);
        double l2 = relativeLuminance(hex2);
        double lighter = Math.max(l1, l2);
        double darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    private static double relativeLuminance(String hex) {
        hex = hex.replace("#", "");
        double r = sRGBtoLinear(Integer.parseInt(hex.substring(0, 2), 16) / 255.0);
        double g = sRGBtoLinear(Integer.parseInt(hex.substring(2, 4), 16) / 255.0);
        double b = sRGBtoLinear(Integer.parseInt(hex.substring(4, 6), 16) / 255.0);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    private static double sRGBtoLinear(double c) {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
}
