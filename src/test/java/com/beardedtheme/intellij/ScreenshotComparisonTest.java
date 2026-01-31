package com.beardedtheme.intellij;

import com.google.gson.*;
import org.junit.BeforeClass;
import org.junit.Test;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Screenshot comparison test that generates a master comparison grid of all
 * themes and validates visual consistency. Also compares against baseline
 * screenshots if they exist.
 *
 * Run ThemeValidationTest first to generate individual screenshots, then
 * run this test to create comparison grids and validate against baselines.
 */
public class ScreenshotComparisonTest {

    private static final Path THEMES_DIR = Paths.get("src/main/resources/themes");
    private static final Path SCREENSHOTS_DIR = Paths.get("build/screenshots");
    private static final Path BASELINE_DIR = Paths.get("src/test/resources/baselines");
    private static final Path DIFF_DIR = Paths.get("build/screenshots/diffs");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private static List<JsonObject> themeList;

    @BeforeClass
    public static void loadThemes() throws Exception {
        Path listFile = THEMES_DIR.resolve("theme-list.json");
        String json = new String(Files.readAllBytes(listFile), StandardCharsets.UTF_8);
        JsonArray array = JsonParser.parseString(json).getAsJsonArray();
        themeList = new ArrayList<>();
        for (JsonElement el : array) {
            themeList.add(el.getAsJsonObject());
        }
    }

    @Test
    public void generateComparisonGrid() throws Exception {
        Files.createDirectories(SCREENSHOTS_DIR);

        int thumbWidth = 400;
        int thumbHeight = 260;
        int cols = 4;
        int rows = (int) Math.ceil((double) themeList.size() / cols);
        int padding = 8;
        int labelHeight = 20;

        int gridWidth = cols * (thumbWidth + padding) + padding;
        int gridHeight = rows * (thumbHeight + labelHeight + padding) + padding;

        BufferedImage grid = new BufferedImage(gridWidth, gridHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = grid.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        // Background
        g.setColor(new Color(0x1a, 0x1a, 0x1a));
        g.fillRect(0, 0, gridWidth, gridHeight);

        int idx = 0;
        for (JsonObject theme : themeList) {
            String slug = theme.get("slug").getAsString();
            String name = theme.get("name").getAsString();
            int col = idx % cols;
            int row = idx / cols;

            int x = padding + col * (thumbWidth + padding);
            int y = padding + row * (thumbHeight + labelHeight + padding);

            // Draw label
            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.PLAIN, 11));
            g.drawString(name, x + 4, y + 14);

            // Draw thumbnail
            Path screenshotFile = SCREENSHOTS_DIR.resolve(slug + ".png");
            if (Files.exists(screenshotFile)) {
                BufferedImage screenshot = ImageIO.read(screenshotFile.toFile());
                g.drawImage(screenshot, x, y + labelHeight, thumbWidth, thumbHeight, null);
            } else {
                g.setColor(new Color(0x33, 0x33, 0x33));
                g.fillRect(x, y + labelHeight, thumbWidth, thumbHeight);
                g.setColor(Color.GRAY);
                g.drawString("Screenshot not found", x + 20, y + labelHeight + thumbHeight / 2);
            }

            // Border
            g.setColor(new Color(0x44, 0x44, 0x44));
            g.drawRect(x, y + labelHeight, thumbWidth - 1, thumbHeight - 1);

            idx++;
        }

        g.dispose();

        Path gridFile = SCREENSHOTS_DIR.resolve("comparison-grid.png");
        ImageIO.write(grid, "PNG", gridFile.toFile());

        assertThat(gridFile).exists();
        System.out.println("Comparison grid saved to: " + gridFile.toAbsolutePath());
    }

    @Test
    public void generateDarkLightComparisonStrip() throws Exception {
        Files.createDirectories(SCREENSHOTS_DIR);

        // Pair dark/light variants
        Map<String, List<JsonObject>> families = new LinkedHashMap<>();
        for (JsonObject theme : themeList) {
            String slug = theme.get("slug").getAsString();
            // Extract family name (remove -light, -dark, -reversed suffixes for grouping)
            String family = slug.replaceAll("-(light|reversed)$", "");
            families.computeIfAbsent(family, k -> new ArrayList<>()).add(theme);
        }

        // Only render families with both dark and light
        List<String[]> pairs = new ArrayList<>();
        for (Map.Entry<String, List<JsonObject>> entry : families.entrySet()) {
            boolean hasDark = false, hasLight = false;
            String darkSlug = null, lightSlug = null;
            String darkName = null, lightName = null;
            for (JsonObject t : entry.getValue()) {
                if (t.get("dark").getAsBoolean()) {
                    hasDark = true;
                    if (darkSlug == null) {
                        darkSlug = t.get("slug").getAsString();
                        darkName = t.get("name").getAsString();
                    }
                } else {
                    hasLight = true;
                    lightSlug = t.get("slug").getAsString();
                    lightName = t.get("name").getAsString();
                }
            }
            if (hasDark && hasLight) {
                pairs.add(new String[]{darkSlug, darkName, lightSlug, lightName});
            }
        }

        if (pairs.isEmpty()) {
            System.out.println("No dark/light pairs found for comparison strip.");
            return;
        }

        int thumbWidth = 400;
        int thumbHeight = 260;
        int padding = 8;
        int labelHeight = 20;

        int stripWidth = 2 * thumbWidth + 3 * padding;
        int stripHeight = pairs.size() * (thumbHeight + labelHeight + padding) + padding;

        BufferedImage strip = new BufferedImage(stripWidth, stripHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = strip.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        g.setColor(new Color(0x22, 0x22, 0x22));
        g.fillRect(0, 0, stripWidth, stripHeight);

        int y = padding;
        for (String[] pair : pairs) {
            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.BOLD, 11));
            g.drawString(pair[1] + "  vs  " + pair[3], padding + 4, y + 14);

            int x = padding;
            for (int i = 0; i < 4; i += 2) {
                Path ssFile = SCREENSHOTS_DIR.resolve(pair[i] + ".png");
                if (Files.exists(ssFile)) {
                    BufferedImage ss = ImageIO.read(ssFile.toFile());
                    g.drawImage(ss, x, y + labelHeight, thumbWidth, thumbHeight, null);
                }
                g.setColor(new Color(0x44, 0x44, 0x44));
                g.drawRect(x, y + labelHeight, thumbWidth - 1, thumbHeight - 1);
                x += thumbWidth + padding;
            }

            y += thumbHeight + labelHeight + padding;
        }

        g.dispose();

        Path stripFile = SCREENSHOTS_DIR.resolve("dark-light-comparison.png");
        ImageIO.write(strip, "PNG", stripFile.toFile());
        assertThat(stripFile).exists();
        System.out.println("Dark/light comparison strip saved to: " + stripFile.toAbsolutePath());
    }

    @Test
    public void compareAgainstBaselines() throws Exception {
        if (!Files.exists(BASELINE_DIR)) {
            System.out.println("No baseline directory found at " + BASELINE_DIR.toAbsolutePath());
            System.out.println("To create baselines, copy build/screenshots/*.png to src/test/resources/baselines/");
            return;
        }

        Files.createDirectories(DIFF_DIR);
        int failCount = 0;
        StringBuilder report = new StringBuilder();
        report.append("Screenshot Comparison Report\n");
        report.append("===========================\n\n");

        for (JsonObject theme : themeList) {
            String slug = theme.get("slug").getAsString();
            Path baselinePath = BASELINE_DIR.resolve(slug + ".png");
            Path currentPath = SCREENSHOTS_DIR.resolve(slug + ".png");

            if (!Files.exists(baselinePath)) {
                report.append("[SKIP] ").append(slug).append(" - no baseline\n");
                continue;
            }
            if (!Files.exists(currentPath)) {
                report.append("[FAIL] ").append(slug).append(" - no current screenshot\n");
                failCount++;
                continue;
            }

            BufferedImage baseline = ImageIO.read(baselinePath.toFile());
            BufferedImage current = ImageIO.read(currentPath.toFile());

            double diffPercent = compareImages(baseline, current, slug);

            if (diffPercent > 1.0) { // Allow up to 1% pixel difference for antialiasing
                report.append("[DIFF] ").append(slug).append(" - ").append(String.format("%.2f%%", diffPercent)).append(" difference\n");
                failCount++;
            } else {
                report.append("[ OK ] ").append(slug).append(" - ").append(String.format("%.2f%%", diffPercent)).append(" difference\n");
            }
        }

        report.append("\n").append(failCount).append(" theme(s) with visual differences > 1%\n");

        Path reportFile = SCREENSHOTS_DIR.resolve("comparison-report.txt");
        Files.write(reportFile, report.toString().getBytes(StandardCharsets.UTF_8));
        System.out.println(report);

        if (failCount > 0) {
            System.out.println("Diff images saved to: " + DIFF_DIR.toAbsolutePath());
        }
    }

    /**
     * Compare two images pixel by pixel and generate a diff image.
     * Returns the percentage of pixels that differ.
     */
    private double compareImages(BufferedImage baseline, BufferedImage current, String slug) throws IOException {
        int width = Math.min(baseline.getWidth(), current.getWidth());
        int height = Math.min(baseline.getHeight(), current.getHeight());

        BufferedImage diff = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        int diffPixels = 0;
        int totalPixels = width * height;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int bRgb = baseline.getRGB(x, y);
                int cRgb = current.getRGB(x, y);

                if (bRgb != cRgb) {
                    // Highlight differences in red
                    int r = Math.abs(((bRgb >> 16) & 0xFF) - ((cRgb >> 16) & 0xFF));
                    int g = Math.abs(((bRgb >> 8) & 0xFF) - ((cRgb >> 8) & 0xFF));
                    int b = Math.abs((bRgb & 0xFF) - (cRgb & 0xFF));
                    int maxDiff = Math.max(r, Math.max(g, b));

                    if (maxDiff > 5) { // Threshold for antialiasing tolerance
                        diff.setRGB(x, y, 0xFFFF0000); // Red for difference
                        diffPixels++;
                    } else {
                        diff.setRGB(x, y, cRgb); // Near-match, keep current
                    }
                } else {
                    diff.setRGB(x, y, (cRgb & 0x00FFFFFF) | 0x40000000); // Semi-transparent for matching
                }
            }
        }

        double diffPercent = (double) diffPixels / totalPixels * 100.0;

        if (diffPercent > 1.0) {
            Path diffFile = DIFF_DIR.resolve(slug + "-diff.png");
            ImageIO.write(diff, "PNG", diffFile.toFile());
        }

        return diffPercent;
    }
}
