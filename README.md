# Bearded Theme for IntelliJ

A carefully crafted collection of **64 color themes** for JetBrains IDEs, ported from the popular [Bearded Theme](https://github.com/BeardedBear/bearded-theme) VS Code extension by BeardedBear.

Includes the [Bearded Icons](https://github.com/BeardedBear/bearded-icons) file icon set with 112 SVG icons for files and folders.

## Theme families

| Family | Variants |
|--------|----------|
| **Classics** | Anthracite, Light |
| **Arc** | Arc, Eolstorm, Blueberry, Eggplant, Reversed |
| **Vivid** | Purple, Black, Light |
| **Monokai** | Terra, Metallian, Stone, Black, Reversed |
| **Solarized** | Dark, Reversed, Light |
| **Oceanic** | Oceanic, Reversed |
| **Milkshake** | Raspberry, Blueberry, Mango, Mint, Vanilla |
| **Black & Gems** | Gold, Ruby, Emerald, Diamond, Amethyst (+ Soft variants) |
| **Aquarelle** | Cymbidium, Hydrangea, Lilac |
| **High contrast** | Ebony, Midnight Void, Wonderland Wood, Brewing Storm, Flurry |
| **Stained** | Purple, Blue |
| **Surprising** | Eggplant, Blueberry, Watermelon |
| **Exotic** | Earth, Coffee, Coffee Reversed, Coffee Cream, Voided, Altica |
| **Featured** | Will, Gold D Raynh, Gold D Raynh Light, Melle Julie, Melle Julie Light, WebDevCody |
| **Special** | Colorblind, OLED, Minuit, Chocolate Espresso |

## Installation

### From JetBrains Marketplace

1. Open **Settings → Plugins → Marketplace**
2. Search for "Bearded Theme"
3. Click **Install** and restart the IDE

### From disk

1. Download the latest `.zip` from [Releases](../../releases)
2. Open **Settings → Plugins → ⚙️ → Install Plugin from Disk...**
3. Select the `.zip` file and restart the IDE

## Applying a theme

Go to **Settings → Appearance & Behavior → Appearance** and select any Bearded Theme variant from the **Theme** dropdown.

## What's included

- **Full UI theming** — tool windows, tabs, trees, menus, buttons, popups, scrollbars, progress bars, status bar, welcome screen, and more
- **Complete editor color schemes** — syntax highlighting with language-specific rules for Java, Kotlin, Python, JavaScript/TypeScript, Go, Rust, PHP, HTML/CSS, JSON, YAML, Markdown, and more
- **Bearded Icons** — 79 file type icons and 33 folder icons covering common languages, frameworks, and config files
- **Icon color palette** — action and object icon colors adapted to each theme variant

## Building from source

```bash
./gradlew buildPlugin
```

The plugin `.zip` will be in `build/distributions/`.

### Regenerating themes

The theme files are generated from color definitions in `scripts/generate-themes.js`:

```bash
node scripts/generate-themes.js
```

### Running tests

```bash
./gradlew test
```

Tests validate theme JSON structure, editor scheme XML, WCAG contrast ratios, icon SVG integrity, and generate screenshot comparisons in `build/screenshots/`.

### Running the IDE with the plugin

```bash
./gradlew runIde
```

## Subscription

This is a freemium plugin. The theme works without a subscription, but a **$1/month** subscription on the JetBrains Marketplace supports continued development and updates.

## Credits

- Original theme by [BeardedBear](https://github.com/BeardedBear)
- VS Code theme: [bearded-theme](https://github.com/BeardedBear/bearded-theme)
- VS Code icons: [bearded-icons](https://github.com/BeardedBear/bearded-icons)

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
