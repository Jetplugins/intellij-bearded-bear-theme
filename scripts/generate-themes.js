#!/usr/bin/env node

/**
 * Bearded Theme - IntelliJ Theme Generator
 *
 * Converts the Bearded Bear VS Code theme color definitions into
 * IntelliJ .theme.json files. Each variant produces a complete
 * IntelliJ theme with editor color scheme and UI customization.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Color utility (minimal colord-like helpers)
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHex({r, g, b}) {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function hexToHsl(hex) {
  const {r: r0, g: g0, b: b0} = hexToRgb(hex);
  const r = r0/255, g = g0/255, b = b0/255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({h, s, l}) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return rgbToHex({r: r*255, g: g*255, b: b*255});
}

function lighten(hex, amount) {
  const hsl = hexToHsl(hex);
  hsl.l = Math.min(100, hsl.l + amount);
  return hslToHex(hsl);
}

function darken(hex, amount) {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, hsl.l - amount);
  return hslToHex(hsl);
}

function mix(hex1, hex2, weight = 0.5) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  return rgbToHex({
    r: c1.r * weight + c2.r * (1 - weight),
    g: c1.g * weight + c2.g * (1 - weight),
    b: c1.b * weight + c2.b * (1 - weight),
  });
}

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return hex.replace("#", "#") + a;
}

function desaturate(hex, amount) {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(0, hsl.s - amount);
  return hslToHex(hsl);
}

function hexToIntelliJ(hex) {
  // IntelliJ uses hex without #
  return hex.replace("#", "").toUpperCase();
}

function escapeXmlAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hexToIntColor(hex) {
  const {r, g, b} = hexToRgb(hex);
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// makeMainColorsDark / makeMainColorsLight  (port from helper.ts)
// ---------------------------------------------------------------------------

function isTooNeutral(hex, threshold = 30) {
  return hexToHsl(hex).s < threshold;
}

function makeMainColorsDark({base, primary, reversed, primaryAlt}) {
  const border = lighten(base, 5);
  const defaultColor = lighten(base, 4);
  const defaultalt = lighten(base, 8);
  const font = lighten(base, 55);
  const fontalt = lighten(base, 35);
  const uibackground = reversed ? lighten(base, 4) : base;
  const uibackgroundmid = reversed ? lighten(base, 2) : lighten(base, 2);
  const uibackgroundalt = reversed ? base : lighten(base, 4);
  const primaryColor = primary;
  const primaryAltColor = primaryAlt || lighten(base, 10);

  return {
    border,
    default: defaultColor,
    defaultalt,
    defaultMain: base,
    font,
    fontalt,
    primary: primaryColor,
    primaryalt: primaryAltColor,
    uibackground,
    uibackgroundalt,
    uibackgroundmid,
  };
}

function makeMainColorsLight({base, primary, primaryAlt}) {
  const border = darken(base, 10);
  const defaultColor = darken(base, 6);
  const defaultalt = darken(base, 12);
  const font = darken(base, 65);
  const fontalt = darken(base, 35);
  const uibackground = base;
  const uibackgroundmid = darken(base, 3);
  const uibackgroundalt = darken(base, 6);
  const primaryColor = primary;
  const primaryAltColor = primaryAlt || darken(base, 15);

  return {
    border,
    default: defaultColor,
    defaultalt,
    defaultMain: base,
    font,
    fontalt,
    primary: primaryColor,
    primaryalt: primaryAltColor,
    uibackground,
    uibackgroundalt,
    uibackgroundmid,
  };
}

// ---------------------------------------------------------------------------
// Theme variant definitions (ported from src/variations/*.ts)
// ---------------------------------------------------------------------------

const classicsColors = {
  blue: "#3398DB",
  green: "#29ae57",
  greenAlt: "#b7d175",
  orange: "#d78012",
  pink: "#d471a9",
  purple: "#8e6daf",
  red: "#c1503d",
  salmon: "#e06e6e",
  turquoize: "#1abc9c",
  yellow: "#d4b074",
};
const classicsLevels = { danger: classicsColors.red, info: classicsColors.blue, success: classicsColors.green, warning: classicsColors.orange };

const arcColors = {
  blue: "#69C3FF", green: "#3CEC85", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#F38CEC", purple: "#B78AFF", red: "#E35535", salmon: "#FF738A",
  turquoize: "#22ECDB", yellow: "#EACD61",
};
const arcLevels = { danger: arcColors.red, info: arcColors.blue, success: arcColors.green, warning: arcColors.orange };

const vividColors = {
  blue: "#28A9FF", green: "#42DD76", greenAlt: "#b7d175", orange: "#FF7135",
  pink: "#E66DFF", purple: "#A95EFF", red: "#D62C2C", salmon: "#FF478D",
  turquoize: "#14E5D4", yellow: "#FFB638",
};
const vividLevels = { danger: vividColors.red, info: vividColors.blue, success: vividColors.green, warning: vividColors.yellow };

const vividLightColors = {
  blue: "#0099ff", green: "#00ac39", greenAlt: "#6f9b00", orange: "#df6800",
  pink: "#E66DFF", purple: "#9c45ff", red: "#D62C2C", salmon: "#ff0062",
  turquoize: "#00b8a9", yellow: "#d48700",
};

const monokaiColors = {
  blue: "#78dce8", green: "#a9dc76", greenAlt: "#b7d175", orange: "#fc9867",
  pink: "#e991e3", purple: "#ab9df2", red: "#fc6a67", salmon: "#ff6188",
  turquoize: "#78e8c6", yellow: "#ffd866",
};
const monokaiLevels = { danger: monokaiColors.red, info: monokaiColors.blue, success: monokaiColors.green, warning: monokaiColors.yellow };

const solarizedColors = {
  blue: "#268bd2", green: "#859900", greenAlt: "#b7d175", orange: "#cb4b16",
  pink: "#d33682", purple: "#6c71c4", red: "#dc322f", salmon: "#e66a6a",
  turquoize: "#2aa198", yellow: "#b58900",
};
const solarizedLevels = { danger: solarizedColors.red, info: solarizedColors.blue, success: solarizedColors.green, warning: solarizedColors.orange };

const solarizedLightColors = {
  blue: "#268bd2", green: "#739d00", greenAlt: "#6a8f07", orange: "#cb4b16",
  pink: "#d33682", purple: "#6c71c4", red: "#dc322f", salmon: "#e66a6a",
  turquoize: "#2aa198", yellow: "#b58900",
};

const oceanicColors = {
  blue: "#6699cc", green: "#99c794", greenAlt: "#b7d175", orange: "#f99157",
  pink: "#d471a9", purple: "#c594c5", red: "#ec5f67", salmon: "#e06e6e",
  turquoize: "#5fb3b3", yellow: "#fac863",
};
const oceanicLevels = { danger: oceanicColors.red, info: oceanicColors.blue, success: oceanicColors.green, warning: oceanicColors.orange };

const milkshakeColors = {
  blue: "#0076c5", green: "#008b17", greenAlt: "#668b07", orange: "#b96000",
  pink: "#c121a4", purple: "#7522d3", red: "#d12525", salmon: "#da2a5f",
  turquoize: "#008f8f", yellow: "#c08403",
};
const milkshakeLevels = { danger: milkshakeColors.red, info: milkshakeColors.blue, success: milkshakeColors.green, warning: milkshakeColors.yellow };

const blackColors = {
  blue: "#69C3FF", green: "#3CEC85", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#F38CEC", purple: "#B78AFF", red: "#E35535", salmon: "#FF738A",
  turquoize: "#22ECDB", yellow: "#EACD61",
};
const blackLevels = { danger: blackColors.red, info: blackColors.blue, success: blackColors.green, warning: blackColors.orange };

const aquarelleColors = {
  blue: "#afd9ec", green: "#b7dda2", greenAlt: "#cfddaa", orange: "#dfc6a2",
  pink: "#eba3c0", purple: "#c4b7e6", red: "#d8877a", salmon: "#e8a19e",
  turquoize: "#a2dbd0", yellow: "#f3e1ac",
};
const aquarelleLevels = { danger: aquarelleColors.red, info: aquarelleColors.blue, success: aquarelleColors.green, warning: aquarelleColors.orange };

const hcColors = {
  blue: "#7fd7f5", green: "#AFEA7B", greenAlt: "#c1e97b", orange: "#ffaa7d",
  pink: "#f5a1e3", purple: "#bc98ff", red: "#fd604f", salmon: "#FF738A",
  turquoize: "#0cf5d9", yellow: "#f3e589",
};
const hcLevels = { danger: hcColors.red, info: hcColors.blue, success: hcColors.green, warning: hcColors.orange };

const stainedColors = {
  blue: "#4FA2FF", green: "#42DD76", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#F38CEC", purple: "#B78AFF", red: "#E35535", salmon: "#FF738A",
  turquoize: "#22ECDB", yellow: "#EACD61",
};
const stainedLevels = { danger: stainedColors.red, info: stainedColors.blue, success: stainedColors.green, warning: stainedColors.orange };

const surprisingBaseColors = {
  blue: "#00B3BD", green: "#a9dc76", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#F38CEC", purple: "#B78AFF", red: "#C13838", salmon: "#FF738A",
};
const surprisingLevels = { danger: "#E35535", info: "#00B3BD", success: "#a9dc76", warning: "#d1a456" };

const colorblindColors = {
  blue: "#4F8FE6", green: "#78CC78", greenAlt: "#b7d175", orange: "#E69A4F",
  pink: "#CC78B7", purple: "#9A78CC", red: "#E64F4F", salmon: "#E6787A",
  turquoize: "#4FC7C7", yellow: "#D1CC6E",
};
const colorblindLevels = { danger: colorblindColors.red, info: colorblindColors.blue, success: colorblindColors.green, warning: colorblindColors.orange };

const oledColors = {
  blue: "#69C3FF", green: "#3CEC85", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#F38CEC", purple: "#B78AFF", red: "#E35535", salmon: "#FF738A",
  turquoize: "#22ECDB", yellow: "#EACD61",
};
const oledLevels = { danger: oledColors.red, info: oledColors.blue, success: oledColors.green, warning: oledColors.orange };

// Exotic theme colors
const earthColors = {
  blue: "#8ab0ed", green: "#85bd6f", greenAlt: "#b7d175", orange: "#d7a455",
  pink: "#d887be", purple: "#a284d1", red: "#c96363", salmon: "#e07472",
  turquoize: "#5fb6a7", yellow: "#d1c67f",
};
const earthLevels = { danger: earthColors.red, info: earthColors.blue, success: earthColors.green, warning: earthColors.orange };

const coffeeColors = {
  blue: "#8ab0ed", green: "#92ca76", greenAlt: "#b7d175", orange: "#e39a5c",
  pink: "#d887be", purple: "#a284d1", red: "#d0645a", salmon: "#e07472",
  turquoize: "#5fb6a7", yellow: "#d1c67f",
};
const coffeeLevels = { danger: coffeeColors.red, info: coffeeColors.blue, success: coffeeColors.green, warning: coffeeColors.orange };

const coffeeLightColors = {
  blue: "#2a6ec5", green: "#2d8a23", greenAlt: "#6a8f07", orange: "#c27225",
  pink: "#b44594", purple: "#7d45b5", red: "#c4473c", salmon: "#d0534a",
  turquoize: "#138a7e", yellow: "#b59b3e",
};

const voidedColors = {
  blue: "#8DC5FF", green: "#80E8A7", greenAlt: "#C3E878", orange: "#FFB07F",
  pink: "#F5A3EB", purple: "#BEAAFF", red: "#FF8A80", salmon: "#FF93A8",
  turquoize: "#6DEBDB", yellow: "#FFE08A",
};
const voidedLevels = { danger: voidedColors.red, info: voidedColors.blue, success: voidedColors.green, warning: voidedColors.orange };

const alticaColors = {
  blue: "#82C9FC", green: "#76D6A3", greenAlt: "#B7E58E", orange: "#F5B679",
  pink: "#ECA0E0", purple: "#B8A0F5", red: "#F5847C", salmon: "#F58F9E",
  turquoize: "#60E0D3", yellow: "#F5D97C",
};
const alticaLevels = { danger: alticaColors.red, info: alticaColors.blue, success: alticaColors.green, warning: alticaColors.orange };

// Feat colors
const willColors = {
  blue: "#8ad0ff", green: "#68d89c", greenAlt: "#A4EF58", orange: "#FF955C",
  pink: "#f397e2", purple: "#bea3f5", red: "#E35535", salmon: "#ff7daa",
  turquoize: "#44f8e9", yellow: "#f0d37c",
};
const willLevels = { danger: willColors.red, info: willColors.blue, success: willColors.green, warning: willColors.orange };

const goldDColors = {
  blue: "#7ec4e6", green: "#8fd49e", greenAlt: "#b7d175", orange: "#e39000",
  pink: "#d887be", purple: "#a284d1", red: "#d95050", salmon: "#e07472",
  turquoize: "#5fb6a7", yellow: "#e6c86b",
};
const goldDLevels = { danger: goldDColors.red, info: goldDColors.blue, success: goldDColors.green, warning: goldDColors.orange };

const goldLightColors = {
  blue: "#2397e5", green: "#2d8a23", greenAlt: "#6a8f07", orange: "#c27225",
  pink: "#b44594", purple: "#7d45b5", red: "#c4473c", salmon: "#d0534a",
  turquoize: "#138a7e", yellow: "#b59b3e",
};

const melleJulieColors = {
  blue: "#7ec4e6", green: "#8fd49e", greenAlt: "#b7d175", orange: "#e0a25c",
  pink: "#d887be", purple: "#a284d1", red: "#d95050", salmon: "#e07472",
  turquoize: "#63edef", yellow: "#e6c86b",
};
const melleJulieLevels = { danger: melleJulieColors.red, info: melleJulieColors.blue, success: melleJulieColors.green, warning: melleJulieColors.orange };

const melleJulieLightColors = {
  blue: "#218d8f", green: "#2d8a23", greenAlt: "#6a8f07", orange: "#c27225",
  pink: "#b44594", purple: "#7d45b5", red: "#c4473c", salmon: "#d0534a",
  turquoize: "#138a7e", yellow: "#b59b3e",
};

const webDevCodyColors = {
  blue: "#7fc4e8", green: "#8fd49e", greenAlt: "#b7d175", orange: "#e0a25c",
  pink: "#f75f94", purple: "#a284d1", red: "#d95050", salmon: "#e07472",
  turquoize: "#63edef", yellow: "#e6c86b",
};
const webDevCodyLevels = { danger: webDevCodyColors.red, info: webDevCodyColors.blue, success: webDevCodyColors.green, warning: webDevCodyColors.orange };

// ---------------------------------------------------------------------------
// Theme registry (slug -> name, theme, isLight, isHC)
// ---------------------------------------------------------------------------

const themeRegistry = [
  // Classics
  { slug: "anthracite", name: "Bearded Theme Anthracite", colors: classicsColors, levels: classicsLevels, ui: makeMainColorsDark({ base: "#181a1f", primary: "#a2abb6" }), light: false },
  { slug: "anthracite-light", name: "Bearded Theme Light", colors: {
    blue: "#2a7ec5", green: "#229a54", greenAlt: "#6a8f07", orange: "#c27225",
    pink: "#b44594", purple: "#7d45b5", red: "#b8473e", salmon: "#d0534a",
    turquoize: "#22a5c9", yellow: "#b59b3e",
  }, levels: classicsLevels, ui: makeMainColorsLight({ base: "#f3f4f5", primary: "#22a5c9" }), light: true },

  // Arc
  { slug: "arc", name: "Bearded Theme Arc", colors: arcColors, levels: arcLevels, ui: makeMainColorsDark({ base: "#1c2433", primary: "#8196b5" }), light: false },
  { slug: "arc-eolstorm", name: "Bearded Theme Arc Eolstorm", colors: arcColors, levels: arcLevels, ui: makeMainColorsDark({ base: "#222A38", primary: "#9DACC3" }), light: false },
  { slug: "arc-blueberry", name: "Bearded Theme Arc Blueberry", colors: arcColors, levels: arcLevels, ui: makeMainColorsDark({ base: "#111422", primary: "#8eb0e6" }), light: false },
  { slug: "arc-eggplant", name: "Bearded Theme Arc Eggplant", colors: arcColors, levels: arcLevels, ui: makeMainColorsDark({ base: "#181421", primary: "#9698d8" }), light: false },
  { slug: "arc-reversed", name: "Bearded Theme Arc Reversed", colors: arcColors, levels: arcLevels, ui: makeMainColorsDark({ base: "#161c28", primary: "#8196b5", reversed: true }), light: false },

  // Vivid
  { slug: "vivid-purple", name: "Bearded Theme Vivid Purple", colors: vividColors, levels: vividLevels, ui: makeMainColorsDark({ base: "#171131", primary: "#A680FF" }), light: false },
  { slug: "vivid-black", name: "Bearded Theme Vivid Black", colors: vividColors, levels: vividLevels, ui: makeMainColorsDark({ base: "#141417", primary: "#AAAAAA" }), light: false },
  { slug: "vivid-light", name: "Bearded Theme Vivid Light", colors: vividLightColors, levels: vividLevels, ui: makeMainColorsLight({ base: "#f4f4f4", primary: "#7e7e7e" }), light: true },

  // Monokai
  { slug: "monokai-terra", name: "Bearded Theme Monokai Terra", colors: monokaiColors, levels: monokaiLevels, ui: makeMainColorsDark({ base: "#262329", primary: "#b0a2a6" }), light: false },
  { slug: "monokai-metallian", name: "Bearded Theme Monokai Metallian", colors: monokaiColors, levels: monokaiLevels, ui: makeMainColorsDark({ base: "#1e212b", primary: "#98a2b5" }), light: false },
  { slug: "monokai-stone", name: "Bearded Theme Monokai Stone", colors: monokaiColors, levels: monokaiLevels, ui: makeMainColorsDark({ base: "#2A2D33", primary: "#9AA2A6" }), light: false },
  { slug: "monokai-black", name: "Bearded Theme Monokai Black", colors: monokaiColors, levels: monokaiLevels, ui: makeMainColorsDark({ base: "#141414", primary: "#8f8f8f" }), light: false },
  { slug: "monokai-reversed", name: "Bearded Theme Monokai Reversed", colors: monokaiColors, levels: monokaiLevels, ui: makeMainColorsDark({ base: "#171921", primary: "#98a2b5", reversed: true }), light: false },

  // Solarized
  { slug: "solarized-dark", name: "Bearded Theme Solarized Dark", colors: solarizedColors, levels: solarizedLevels, ui: makeMainColorsDark({ base: "#002b36", primary: "#839496" }), light: false },
  { slug: "solarized-reversed", name: "Bearded Theme Solarized Reversed", colors: solarizedColors, levels: solarizedLevels, ui: makeMainColorsDark({ base: "#00222b", primary: "#839496", reversed: true }), light: false },
  { slug: "solarized-light", name: "Bearded Theme Solarized Light", colors: solarizedLightColors, levels: solarizedLevels, ui: makeMainColorsLight({ base: "#fdf6e3", primary: "#839496" }), light: true },

  // Oceanic
  { slug: "oceanic", name: "Bearded Theme Oceanic", colors: oceanicColors, levels: oceanicLevels, ui: makeMainColorsDark({ base: "#1a2b34", primary: "#8fa2a7" }), light: false },
  { slug: "oceanic-reversed", name: "Bearded Theme Oceanic Reversed", colors: oceanicColors, levels: oceanicLevels, ui: makeMainColorsDark({ base: "#152229", primary: "#8fa2a7", reversed: true }), light: false },

  // Milkshake
  { slug: "milkshake-raspberry", name: "Bearded Theme Milkshake Raspberry", colors: milkshakeColors, levels: milkshakeLevels, ui: makeMainColorsLight({ base: "#f1e8eb", primary: "#d1174f", primaryAlt: "#f6eff1" }), light: true },
  { slug: "milkshake-blueberry", name: "Bearded Theme Milkshake Blueberry", colors: milkshakeColors, levels: milkshakeLevels, ui: makeMainColorsLight({ base: "#dad9eb", primary: "#422eb0" }), light: true },
  { slug: "milkshake-mango", name: "Bearded Theme Milkshake Mango", colors: milkshakeColors, levels: milkshakeLevels, ui: makeMainColorsLight({ base: "#f3eae3", primary: "#bd4f27" }), light: true },
  { slug: "milkshake-mint", name: "Bearded Theme Milkshake Mint", colors: milkshakeColors, levels: milkshakeLevels, ui: makeMainColorsLight({ base: "#edf3ee", primary: "#2a9b7d" }), light: true },
  { slug: "milkshake-vanilla", name: "Bearded Theme Milkshake Vanilla", colors: milkshakeColors, levels: milkshakeLevels, ui: makeMainColorsLight({ base: "#ece7da", primary: "#937416" }), light: true },

  // Black & Gems
  { slug: "black-gold", name: "Bearded Theme Black & Gold", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#111418", primary: "#EACD61" }), light: false },
  { slug: "black-gold-soft", name: "Bearded Theme Black & Gold Soft", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#15151a", primary: "#EACD61" }), light: false },
  { slug: "black-ruby", name: "Bearded Theme Black & Ruby", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#111418", primary: "#FF738A" }), light: false },
  { slug: "black-ruby-soft", name: "Bearded Theme Black & Ruby Soft", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#171518", primary: "#FF738A" }), light: false },
  { slug: "black-emerald", name: "Bearded Theme Black & Emerald", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#111418", primary: "#22ECDB" }), light: false },
  { slug: "black-emerald-soft", name: "Bearded Theme Black & Emerald Soft", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#131518", primary: "#22ECDB" }), light: false },
  { slug: "black-diamond", name: "Bearded Theme Black & Diamond", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#111418", primary: "#69C3FF" }), light: false },
  { slug: "black-diamond-soft", name: "Bearded Theme Black & Diamond Soft", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#131518", primary: "#69C3FF" }), light: false },
  { slug: "black-amethyst", name: "Bearded Theme Black & Amethyst", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#111418", primary: "#B78AFF" }), light: false },
  { slug: "black-amethyst-soft", name: "Bearded Theme Black & Amethyst Soft", colors: blackColors, levels: blackLevels, ui: makeMainColorsDark({ base: "#151418", primary: "#B78AFF" }), light: false },

  // Aquarelle
  { slug: "aquarelle-cymbidium", name: "Bearded Theme Aquarelle Cymbidium", colors: aquarelleColors, levels: aquarelleLevels, ui: makeMainColorsDark({ base: "#2c252a", primary: "#da6e6c" }), light: false },
  { slug: "aquarelle-hydrangea", name: "Bearded Theme Aquarelle Hydrangea", colors: aquarelleColors, levels: aquarelleLevels, ui: makeMainColorsDark({ base: "#22273c", primary: "#6394f1" }), light: false },
  { slug: "aquarelle-lilac", name: "Bearded Theme Aquarelle Lilac", colors: aquarelleColors, levels: aquarelleLevels, ui: makeMainColorsDark({ base: "#252433", primary: "#9587ff" }), light: false },

  // HC
  { slug: "hc-ebony", name: "Bearded Theme HC Ebony", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#181820", primary: "#c2c8d7" }), light: false, hc: true },
  { slug: "hc-midnightvoid", name: "Bearded Theme HC Midnight Void", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#151f27", primary: "#99b3c9" }), light: false, hc: true },
  { slug: "hc-wonderlandwood", name: "Bearded Theme HC Wonderland Wood", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#1F1D36", primary: "#bdb5d6" }), light: false, hc: true },
  { slug: "hc-brewingstorm", name: "Bearded Theme HC Brewing Storm", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#0c2a42", primary: "#8fb8d8" }), light: false, hc: true },
  { slug: "hc-flurry", name: "Bearded Theme HC Flurry", colors: {
    blue: "#0076c5", green: "#008b17", greenAlt: "#668b07", orange: "#b96000",
    pink: "#c121a4", purple: "#7522d3", red: "#d12525", salmon: "#da2a5f",
    turquoize: "#008f8f", yellow: "#c08403",
  }, levels: hcLevels, ui: makeMainColorsLight({ base: "#f5f8fc", primary: "#3a6fa5" }), light: true, hc: true },
  { slug: "minuit", name: "Bearded Theme Minuit", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#1C1827", primary: "#b2a9cb" }), light: false },
  { slug: "chocolate-espresso", name: "Bearded Theme Chocolate Espresso", colors: hcColors, levels: hcLevels, ui: makeMainColorsDark({ base: "#2e2424", primary: "#c0a9a9" }), light: false },

  // Stained
  { slug: "stained-purple", name: "Bearded Theme Stained Purple", colors: stainedColors, levels: stainedLevels, ui: makeMainColorsDark({ base: "#20192b", primary: "#a948ef" }), light: false },
  { slug: "stained-blue", name: "Bearded Theme Stained Blue", colors: stainedColors, levels: stainedLevels, ui: makeMainColorsDark({ base: "#121726", primary: "#3A7FFF" }), light: false },

  // Surprising
  { slug: "surprising-eggplant", name: "Bearded Theme Surprising Eggplant", colors: { ...surprisingBaseColors, turquoize: "#d24e4e", yellow: "#d1a456" }, levels: surprisingLevels, ui: makeMainColorsDark({ base: "#1d1426", primary: "#d24e4e" }), light: false },
  { slug: "surprising-blueberry", name: "Bearded Theme Surprising Blueberry", colors: { ...surprisingBaseColors, turquoize: "#c93e71", yellow: "#d1a456" }, levels: surprisingLevels, ui: makeMainColorsDark({ base: "#101a29", primary: "#c93e71" }), light: false },
  { slug: "surprising-watermelon", name: "Bearded Theme Surprising Watermelon", colors: { ...surprisingBaseColors, turquoize: "#da6c62", yellow: "#d1a456" }, levels: surprisingLevels, ui: makeMainColorsDark({ base: "#142326", primary: "#da6c62" }), light: false },

  // Colorblind
  { slug: "colorblind", name: "Bearded Theme Colorblind", colors: colorblindColors, levels: colorblindLevels, ui: makeMainColorsDark({ base: "#1b1e28", primary: "#9887eb" }), light: false },

  // OLED
  { slug: "oled", name: "Bearded Theme OLED", colors: oledColors, levels: oledLevels, ui: {
    border: lighten("#000000", 10),
    default: lighten("#000000", 4),
    defaultalt: lighten("#000000", 8),
    defaultMain: "#000000",
    font: "#c5c5c5",
    fontalt: "#808080",
    primary: "#688eff",
    primaryalt: lighten("#000000", 15),
    uibackground: "#000000",
    uibackgroundalt: lighten("#000000", 4),
    uibackgroundmid: lighten("#000000", 2),
  }, light: false },

  // Exotic
  { slug: "earth", name: "Bearded Theme Earth", colors: earthColors, levels: earthLevels, ui: makeMainColorsDark({ base: "#221b1b", primary: "#d35386" }), light: false },
  { slug: "coffee", name: "Bearded Theme Coffee", colors: coffeeColors, levels: coffeeLevels, ui: makeMainColorsDark({ base: "#292423", primary: "#F09177" }), light: false },
  { slug: "coffee-reversed", name: "Bearded Theme Coffee Reversed", colors: coffeeColors, levels: coffeeLevels, ui: makeMainColorsDark({ base: "#231e1d", primary: "#F09177", reversed: true }), light: false },
  { slug: "coffee-cream", name: "Bearded Theme Coffee Cream", colors: coffeeLightColors, levels: coffeeLevels, ui: makeMainColorsLight({ base: "#EAE4E1", primary: "#c27225" }), light: true },
  { slug: "voided", name: "Bearded Theme Voided", colors: voidedColors, levels: voidedLevels, ui: makeMainColorsDark({ base: "#101023", primary: "#7A63ED" }), light: false },
  { slug: "altica", name: "Bearded Theme Altica", colors: alticaColors, levels: alticaLevels, ui: {
    border: "#2C3543",
    default: "#232D3B",
    defaultalt: "#354357",
    defaultMain: "#1A2332",
    font: "#A8B8CC",
    fontalt: "#6B7D92",
    primary: "#60A8E0",
    primaryalt: "#2F4052",
    uibackground: "#1A2332",
    uibackgroundalt: "#232D3B",
    uibackgroundmid: "#1E2838",
  }, light: false },

  // Feat
  { slug: "will", name: "Bearded Theme Will", colors: willColors, levels: willLevels, ui: makeMainColorsDark({ base: "#17171f", primary: "#8f9eb8" }), light: false },
  { slug: "gold-d-raynh", name: "Bearded Theme Gold D Raynh", colors: goldDColors, levels: goldDLevels, ui: makeMainColorsDark({ base: "#0f1628", primary: "#e39000" }), light: false },
  { slug: "gold-d-raynh-light", name: "Bearded Theme Gold D Raynh Light", colors: goldLightColors, levels: goldDLevels, ui: makeMainColorsLight({ base: "#f5f5f5", primary: "#2397e5" }), light: true },
  { slug: "melle-julie", name: "Bearded Theme Melle Julie", colors: melleJulieColors, levels: melleJulieLevels, ui: makeMainColorsDark({ base: "#1c1f24", primary: "#63edef" }), light: false },
  { slug: "melle-julie-light", name: "Bearded Theme Melle Julie Light", colors: melleJulieLightColors, levels: melleJulieLevels, ui: makeMainColorsLight({ base: "#edeeee", primary: "#218d8f" }), light: true },
  { slug: "webdevcody", name: "Bearded Theme WebDevCody", colors: webDevCodyColors, levels: webDevCodyLevels, ui: makeMainColorsDark({ base: "#00171e", primary: "#e95d74" }), light: false },
];

// ---------------------------------------------------------------------------
// IntelliJ theme JSON generator
// ---------------------------------------------------------------------------

function generateThemeJson(entry) {
  const { slug, name, colors, levels, ui, light, hc } = entry;
  const isDark = !light;

  // Map VS Code token colors to IntelliJ editor scheme attributes
  const theme = {
    name: name,
    dark: isDark,
    author: "Bearded Bear (IntelliJ port)",
    editorScheme: `/themes/${slug}.xml`,
    ui: {
      "*": {
        arc: isDark ? "7" : "5",
        background: ui.uibackground,
        foreground: ui.font,
        selectionBackground: isDark ? lighten(ui.uibackground, 12) : darken(ui.uibackground, 12),
        selectionForeground: ui.font,
        selectionInactiveBackground: isDark ? lighten(ui.uibackground, 8) : darken(ui.uibackground, 8),
        disabledBackground: ui.uibackgroundalt,
        disabledForeground: ui.fontalt,
        disabledText: ui.fontalt,
        errorForeground: levels.danger,
        infoForeground: levels.info,
        lightSelectionBackground: isDark ? lighten(ui.uibackground, 10) : darken(ui.uibackground, 10),
        separatorColor: ui.border,
      },
      ActionButton: {
        hoverBackground: ui.defaultalt,
        hoverBorderColor: ui.defaultalt,
        pressedBackground: isDark ? lighten(ui.defaultalt, 5) : darken(ui.defaultalt, 5),
        pressedBorderColor: ui.border,
      },
      Button: {
        default: {
          foreground: isDark ? "#ffffff" : "#ffffff",
          startBackground: ui.primary,
          endBackground: ui.primary,
          startBorderColor: ui.primary,
          endBorderColor: ui.primary,
          focusedBorderColor: lighten(ui.primary, 10),
        },
        foreground: ui.font,
        startBackground: ui.defaultalt,
        endBackground: ui.defaultalt,
        startBorderColor: ui.border,
        endBorderColor: ui.border,
        shadowColor: darken(ui.uibackground, 5),
      },
      CheckBox: {
        background: ui.uibackground,
        foreground: ui.font,
      },
      ComboBox: {
        background: ui.uibackgroundalt,
        foreground: ui.font,
        selectionBackground: ui.primary,
        selectionForeground: "#ffffff",
        nonEditableBackground: ui.uibackgroundalt,
        ArrowButton: {
          background: ui.uibackgroundalt,
          nonEditableBackground: ui.uibackgroundalt,
          iconColor: ui.fontalt,
        },
      },
      CompletionPopup: {
        background: ui.uibackground,
        foreground: ui.font,
        matchForeground: ui.primary,
        selectionBackground: ui.defaultalt,
        selectionInactiveBackground: ui.default,
      },
      Counter: {
        background: ui.primary,
        foreground: isDark ? "#ffffff" : "#ffffff",
      },
      DefaultTabs: {
        background: ui.uibackground,
        underlineColor: ui.primary,
        inactiveUnderlineColor: ui.fontalt,
        hoverBackground: ui.defaultalt,
        underlinedTabBackground: isDark ? lighten(ui.uibackground, 3) : darken(ui.uibackground, 3),
        underlinedTabForeground: ui.font,
        underlineHeight: 3,
      },
      DragAndDrop: {
        areaBackground: isDark ? lighten(ui.uibackground, 8) + "80" : darken(ui.uibackground, 8) + "80",
        borderColor: ui.primary,
      },
      Editor: {
        background: ui.uibackground,
        foreground: ui.font,
        shortcutForeground: ui.primary,
      },
      EditorTabs: {
        background: ui.uibackgroundalt,
        underlineColor: ui.primary,
        underlineHeight: 3,
        underlinedTabBackground: ui.uibackground,
        underlinedTabForeground: ui.font,
        inactiveUnderlineColor: "transparent",
        inactiveMaskColor: "00000000",
      },
      FileColor: {
        Yellow: isDark ? lighten(ui.uibackground, 3) : darken(ui.uibackground, 3),
        Green: isDark ? mix(ui.uibackground, levels.success, 0.9) : mix(ui.uibackground, levels.success, 0.9),
        Blue: isDark ? mix(ui.uibackground, levels.info, 0.9) : mix(ui.uibackground, levels.info, 0.9),
        Violet: isDark ? mix(ui.uibackground, colors.purple, 0.9) : mix(ui.uibackground, colors.purple, 0.9),
        Orange: isDark ? mix(ui.uibackground, levels.warning, 0.9) : mix(ui.uibackground, levels.warning, 0.9),
        Rose: isDark ? mix(ui.uibackground, levels.danger, 0.9) : mix(ui.uibackground, levels.danger, 0.9),
      },
      Link: {
        activeForeground: ui.primary,
        hoverForeground: lighten(ui.primary, 10),
        pressedForeground: darken(ui.primary, 10),
        visitedForeground: colors.purple,
        secondaryForeground: ui.fontalt,
      },
      List: {
        background: ui.uibackground,
        foreground: ui.font,
        selectionBackground: ui.defaultalt,
        selectionForeground: ui.font,
        selectionInactiveBackground: ui.default,
        selectionInactiveForeground: ui.font,
        hoverBackground: ui.default,
        hoverInactiveBackground: ui.default,
      },
      Menu: {
        background: ui.uibackground,
        foreground: ui.font,
        selectionBackground: ui.defaultalt,
        selectionForeground: ui.font,
        separatorColor: ui.border,
        borderColor: ui.border,
      },
      MenuBar: {
        background: ui.uibackground,
        foreground: ui.font,
        hoverBackground: ui.defaultalt,
        selectionBackground: ui.defaultalt,
        selectionForeground: ui.font,
      },
      NavBar: {
        borderColor: ui.border,
      },
      Notification: {
        background: ui.uibackgroundalt,
        foreground: ui.font,
        borderColor: ui.border,
        errorBackground: mix(ui.uibackground, levels.danger, 0.8),
        errorForeground: ui.font,
        errorBorderColor: levels.danger,
        ToolWindow: {
          informativeBackground: ui.uibackgroundalt,
          informativeForeground: ui.font,
          informativeBorderColor: levels.info,
          warningBackground: mix(ui.uibackground, levels.warning, 0.8),
          warningForeground: ui.font,
          warningBorderColor: levels.warning,
          errorBackground: mix(ui.uibackground, levels.danger, 0.8),
          errorForeground: ui.font,
          errorBorderColor: levels.danger,
        },
      },
      Panel: {
        background: ui.uibackground,
        foreground: ui.font,
      },
      Plugins: {
        background: ui.uibackground,
        SearchField: {
          background: ui.uibackgroundalt,
        },
        SectionHeader: {
          background: ui.uibackgroundalt,
          foreground: ui.font,
        },
        hoverBackground: ui.default,
        lightSelectionBackground: ui.defaultalt,
        tagBackground: ui.defaultalt,
        tagForeground: ui.font,
        Button: {
          installBackground: ui.primary,
          installForeground: "#ffffff",
          installBorderColor: ui.primary,
          installFillBackground: ui.primary,
          installFillForeground: "#ffffff",
          updateBackground: levels.info,
          updateForeground: "#ffffff",
          updateBorderColor: levels.info,
        },
      },
      Popup: {
        background: ui.uibackground,
        foreground: ui.font,
        Header: {
          activeBackground: ui.defaultalt,
          inactiveBackground: ui.default,
        },
        Advertiser: {
          background: ui.uibackgroundalt,
          foreground: ui.fontalt,
          borderColor: ui.border,
        },
        borderColor: ui.border,
        inactiveBorderColor: ui.border,
        separatorColor: ui.border,
        separatorForeground: ui.fontalt,
        paintBorder: true,
      },
      ProgressBar: {
        progressColor: ui.primary,
        indeterminateStartColor: ui.primary,
        indeterminateEndColor: lighten(ui.primary, 20),
        trackColor: ui.defaultalt,
        failedColor: levels.danger,
        failedEndColor: darken(levels.danger, 10),
        passedColor: levels.success,
        passedEndColor: lighten(levels.success, 10),
      },
      ScrollBar: {
        Mac: {
          thumbColor: isDark ? lighten(ui.uibackground, 15) + "80" : darken(ui.uibackground, 15) + "80",
          thumbBorderColor: isDark ? lighten(ui.uibackground, 15) + "80" : darken(ui.uibackground, 15) + "80",
          hoverThumbColor: isDark ? lighten(ui.uibackground, 25) + "B0" : darken(ui.uibackground, 25) + "B0",
          hoverThumbBorderColor: isDark ? lighten(ui.uibackground, 25) + "B0" : darken(ui.uibackground, 25) + "B0",
          Transparent: {
            thumbColor: isDark ? lighten(ui.uibackground, 15) + "50" : darken(ui.uibackground, 15) + "50",
            thumbBorderColor: isDark ? lighten(ui.uibackground, 15) + "50" : darken(ui.uibackground, 15) + "50",
            hoverThumbColor: isDark ? lighten(ui.uibackground, 25) + "80" : darken(ui.uibackground, 25) + "80",
            hoverThumbBorderColor: isDark ? lighten(ui.uibackground, 25) + "80" : darken(ui.uibackground, 25) + "80",
          },
        },
        thumbColor: isDark ? lighten(ui.uibackground, 15) + "80" : darken(ui.uibackground, 15) + "80",
        thumbBorderColor: isDark ? lighten(ui.uibackground, 15) + "80" : darken(ui.uibackground, 15) + "80",
        hoverThumbColor: isDark ? lighten(ui.uibackground, 25) + "B0" : darken(ui.uibackground, 25) + "B0",
        hoverThumbBorderColor: isDark ? lighten(ui.uibackground, 25) + "B0" : darken(ui.uibackground, 25) + "B0",
        trackColor: "transparent",
        hoverTrackColor: isDark ? lighten(ui.uibackground, 5) + "40" : darken(ui.uibackground, 5) + "40",
        Transparent: {
          thumbColor: isDark ? lighten(ui.uibackground, 15) + "50" : darken(ui.uibackground, 15) + "50",
          thumbBorderColor: isDark ? lighten(ui.uibackground, 15) + "50" : darken(ui.uibackground, 15) + "50",
          hoverThumbColor: isDark ? lighten(ui.uibackground, 25) + "80" : darken(ui.uibackground, 25) + "80",
          hoverThumbBorderColor: isDark ? lighten(ui.uibackground, 25) + "80" : darken(ui.uibackground, 25) + "80",
        },
      },
      SearchEverywhere: {
        Advertiser: {
          background: ui.uibackgroundalt,
          foreground: ui.fontalt,
          borderColor: ui.border,
        },
        Header: {
          background: ui.uibackground,
        },
        SearchField: {
          background: ui.uibackground,
          borderColor: ui.border,
        },
        Tab: {
          selectedBackground: ui.defaultalt,
          selectedForeground: ui.font,
        },
      },
      SidePanel: {
        background: ui.uibackgroundalt,
      },
      SpeedSearch: {
        background: ui.uibackgroundalt,
        foreground: ui.font,
        borderColor: ui.primary,
        errorForeground: levels.danger,
      },
      StatusBar: {
        background: ui.uibackgroundalt,
        foreground: ui.fontalt,
        borderColor: ui.border,
        hoverBackground: ui.defaultalt,
      },
      TabbedPane: {
        background: ui.uibackground,
        foreground: ui.font,
        contentAreaColor: ui.border,
        hoverColor: ui.defaultalt,
        underlineColor: ui.primary,
        focusColor: ui.defaultalt,
      },
      Table: {
        background: ui.uibackground,
        foreground: ui.font,
        selectionBackground: ui.defaultalt,
        selectionForeground: ui.font,
        selectionInactiveBackground: ui.default,
        selectionInactiveForeground: ui.font,
        gridColor: ui.border,
        hoverBackground: ui.default,
        hoverInactiveBackground: ui.default,
        lightSelectionBackground: ui.defaultalt,
        lightSelectionForeground: ui.font,
        lightSelectionInactiveBackground: ui.default,
        lightSelectionInactiveForeground: ui.font,
        stripeColor: ui.uibackgroundalt,
      },
      TextArea: {
        background: ui.uibackground,
        foreground: ui.font,
        caretForeground: ui.font,
        selectionBackground: isDark ? lighten(ui.uibackground, 15) : darken(ui.uibackground, 15),
        selectionForeground: ui.font,
      },
      TextField: {
        background: ui.uibackgroundalt,
        foreground: ui.font,
        caretForeground: ui.font,
        selectionBackground: isDark ? lighten(ui.uibackground, 15) : darken(ui.uibackground, 15),
        selectionForeground: ui.font,
      },
      TitlePane: {
        background: ui.uibackground,
        foreground: ui.font,
        inactiveBackground: ui.uibackground,
        inactiveForeground: ui.fontalt,
        Button: {
          hoverBackground: ui.defaultalt,
        },
      },
      ToggleButton: {
        onBackground: ui.primary,
        onForeground: "#ffffff",
        offBackground: ui.defaultalt,
        offForeground: ui.font,
        buttonColor: "#ffffff",
      },
      ToolBar: {
        background: ui.uibackground,
        foreground: ui.font,
      },
      ToolWindow: {
        background: ui.uibackground,
        Button: {
          hoverBackground: ui.defaultalt,
          selectedBackground: ui.defaultalt,
          selectedForeground: ui.font,
        },
        Header: {
          background: ui.uibackgroundalt,
          inactiveBackground: ui.uibackgroundalt,
          borderColor: ui.border,
        },
        HeaderTab: {
          selectedBackground: ui.uibackground,
          selectedInactiveBackground: ui.uibackgroundalt,
          hoverBackground: ui.default,
          hoverInactiveBackground: ui.default,
          underlineColor: ui.primary,
          underlineHeight: 3,
          inactiveUnderlineColor: ui.fontalt,
        },
      },
      Tree: {
        background: ui.uibackground,
        foreground: ui.font,
        selectionBackground: ui.defaultalt,
        selectionForeground: ui.font,
        selectionInactiveBackground: ui.default,
        selectionInactiveForeground: ui.font,
        hoverBackground: ui.default,
        hoverInactiveBackground: ui.default,
        modifiedItemForeground: levels.info,
        rowHeight: 24,
      },
      VersionControl: {
        Log: {
          Commit: {
            currentBranchBackground: isDark ? lighten(ui.uibackground, 5) : darken(ui.uibackground, 5),
            hoveredBackground: ui.default,
            selectedBackground: ui.defaultalt,
          },
        },
        RefLabel: {
          backgroundBase: ui.defaultalt,
          backgroundBrightness: isDark ? 0.3 : 0.8,
          foreground: ui.font,
        },
      },
      WelcomeScreen: {
        background: ui.uibackground,
        SidePanel: {
          background: ui.uibackgroundalt,
        },
        separatorColor: ui.border,
        Projects: {
          background: ui.uibackground,
          selectionBackground: ui.defaultalt,
          selectionInactiveBackground: ui.default,
          actions: {
            background: ui.defaultalt,
            selectionBackground: isDark ? lighten(ui.defaultalt, 5) : darken(ui.defaultalt, 5),
          },
        },
      },
    },
    icons: {
      ColorPalette: {
        "Actions.Grey": ui.fontalt,
        "Actions.Red": levels.danger,
        "Actions.Yellow": levels.warning,
        "Actions.Green": levels.success,
        "Actions.Blue": levels.info,
        "Actions.GreyInline": ui.fontalt,
        "Actions.GreyInline.Dark": ui.fontalt,
        "Objects.Grey": ui.fontalt,
        "Objects.RedStatus": levels.danger,
        "Objects.Red": levels.danger,
        "Objects.Pink": colors.pink,
        "Objects.Yellow": colors.yellow,
        "Objects.Green": colors.green,
        "Objects.Blue": colors.blue,
        "Objects.Purple": colors.purple,
        "Objects.BlackText": ui.font,
        "Objects.YellowDark": darken(colors.yellow, 10),
        "Objects.GreenAndroid": colors.green,
        "Checkbox.Background.Default": ui.uibackgroundalt,
        "Checkbox.Border.Default": ui.border,
        "Checkbox.Foreground.Selected": "#ffffff",
        "Checkbox.Focus.Thin.Default": ui.primary,
        "Checkbox.Focus.Thin.Selected": ui.primary,
        "Checkbox.Background.Selected": ui.primary,
        "Checkbox.Border.Selected": ui.primary,
        "Checkbox.Background.Disabled": ui.default,
        "Checkbox.Border.Disabled": ui.border,
        "Checkbox.Foreground.Disabled": ui.fontalt,
      },
    },
  };

  return theme;
}

// ---------------------------------------------------------------------------
// IntelliJ Editor Color Scheme XML generator
// ---------------------------------------------------------------------------

function generateEditorSchemeXml(entry) {
  const { slug, name, colors, levels, ui, light } = entry;
  const isDark = !light;

  const bg = hexToIntelliJ(ui.uibackground);
  const fg = hexToIntelliJ(ui.font);
  const fgAlt = hexToIntelliJ(ui.fontalt);
  const border = hexToIntelliJ(ui.border);
  const selection = hexToIntelliJ(isDark ? lighten(ui.uibackground, 12) : darken(ui.uibackground, 12));
  const lineHighlight = hexToIntelliJ(isDark ? lighten(ui.uibackground, 4) : darken(ui.uibackground, 4));
  const gutter = hexToIntelliJ(ui.uibackgroundalt);
  const caretRow = hexToIntelliJ(isDark ? lighten(ui.uibackground, 3) : darken(ui.uibackground, 3));

  // Convert colors to IntelliJ hex (no #)
  const c = {};
  for (const [k, v] of Object.entries(colors)) c[k] = hexToIntelliJ(v);
  const l = {};
  for (const [k, v] of Object.entries(levels)) l[k] = hexToIntelliJ(v);

  const pri = hexToIntelliJ(ui.primary);

  // Build editor scheme colors for diff, search, etc.
  const addedBg = hexToIntelliJ(isDark ? mix(ui.uibackground, levels.success, 0.85) : mix(ui.uibackground, levels.success, 0.85));
  const deletedBg = hexToIntelliJ(isDark ? mix(ui.uibackground, levels.danger, 0.85) : mix(ui.uibackground, levels.danger, 0.85));
  const modifiedBg = hexToIntelliJ(isDark ? mix(ui.uibackground, levels.info, 0.85) : mix(ui.uibackground, levels.info, 0.85));
  const conflictBg = hexToIntelliJ(isDark ? mix(ui.uibackground, levels.warning, 0.85) : mix(ui.uibackground, levels.warning, 0.85));

  const addedStripe = hexToIntelliJ(levels.success);
  const deletedStripe = hexToIntelliJ(levels.danger);
  const modifiedStripe = hexToIntelliJ(levels.info);
  const conflictStripe = hexToIntelliJ(levels.warning);

  const searchBg = hexToIntelliJ(isDark ? mix(ui.uibackground, colors.yellow, 0.7) : mix(ui.uibackground, colors.yellow, 0.7));
  const searchWriteBg = hexToIntelliJ(isDark ? mix(ui.uibackground, colors.orange, 0.7) : mix(ui.uibackground, colors.orange, 0.7));

  const bracketBg = hexToIntelliJ(isDark ? lighten(ui.uibackground, 10) : darken(ui.uibackground, 10));

  const xmlName = escapeXmlAttr(name);

  return `<?xml version="1.0" encoding="UTF-8"?>
<scheme name="${xmlName}" version="142" parent_scheme="${isDark ? "Darcula" : "Default"}">
  <metaInfo>
    <property name="created">2024-01-01T00:00:00</property>
    <property name="ide">Idea</property>
    <property name="ideVersion">2024.1.0.0</property>
    <property name="modified">2024-01-01T00:00:00</property>
    <property name="originalScheme">${xmlName}</property>
  </metaInfo>
  <colors>
    <option name="ADDED_LINES_COLOR" value="${addedStripe}" />
    <option name="ANNOTATIONS_COLOR" value="${fgAlt}" />
    <option name="CARET_COLOR" value="${fg}" />
    <option name="CARET_ROW_COLOR" value="${caretRow}" />
    <option name="CONSOLE_BACKGROUND_KEY" value="${bg}" />
    <option name="DELETED_LINES_COLOR" value="${deletedStripe}" />
    <option name="DIFF_SEPARATORS_BACKGROUND" value="${hexToIntelliJ(ui.uibackgroundalt)}" />
    <option name="DOCUMENTATION_COLOR" value="${bg}" />
    <option name="DOC_COMMENT_GUIDE" value="${border}" />
    <option name="DOC_COMMENT_LINK" value="${c.blue}" />
    <option name="ERROR_HINT" value="${l.danger}" />
    <option name="FILESTATUS_ADDED" value="${l.success}" />
    <option name="FILESTATUS_DELETED" value="${l.danger}" />
    <option name="FILESTATUS_IDEA_FILESTATUS_DELETED_FROM_FILE_SYSTEM" value="${fgAlt}" />
    <option name="FILESTATUS_IDEA_FILESTATUS_IGNORED" value="${fgAlt}" />
    <option name="FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_BOTH_CONFLICTS" value="${l.warning}" />
    <option name="FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_CONFLICTS" value="${l.warning}" />
    <option name="FILESTATUS_IDEA_FILESTATUS_MERGED_WITH_PROPERTY_CONFLICTS" value="${l.warning}" />
    <option name="FILESTATUS_MERGED" value="${c.purple}" />
    <option name="FILESTATUS_MODIFIED" value="${l.info}" />
    <option name="FILESTATUS_NOT_CHANGED_IMMEDIATE" value="${l.info}" />
    <option name="FILESTATUS_NOT_CHANGED_RECURSIVE" value="${l.info}" />
    <option name="FILESTATUS_UNKNOWN" value="${l.danger}" />
    <option name="FILESTATUS_addedOutside" value="${l.success}" />
    <option name="FILESTATUS_changelistConflict" value="${l.warning}" />
    <option name="FILESTATUS_modifiedOutside" value="${l.info}" />
    <option name="FOLDED_TEXT_BORDER_COLOR" value="${border}" />
    <option name="GUTTER_BACKGROUND" value="${bg}" />
    <option name="IGNORED_ADDED_LINES_BORDER_COLOR" value="${addedStripe}" />
    <option name="IGNORED_DELETED_LINES_BORDER_COLOR" value="${deletedStripe}" />
    <option name="IGNORED_MODIFIED_LINES_BORDER_COLOR" value="${modifiedStripe}" />
    <option name="INDENT_GUIDE" value="${border}" />
    <option name="INFORMATION_HINT" value="${hexToIntelliJ(ui.uibackgroundalt)}" />
    <option name="LINE_NUMBER_ON_CARET_ROW_COLOR" value="${fg}" />
    <option name="LINE_NUMBERS_COLOR" value="${fgAlt}" />
    <option name="LOOKUP_COLOR" value="${bg}" />
    <option name="METHOD_SEPARATORS_COLOR" value="${border}" />
    <option name="MODIFIED_LINES_COLOR" value="${modifiedStripe}" />
    <option name="NOTIFICATION_BACKGROUND" value="${hexToIntelliJ(ui.uibackgroundalt)}" />
    <option name="QUESTION_HINT" value="${hexToIntelliJ(ui.uibackgroundalt)}" />
    <option name="RECENT_LOCATIONS_SELECTION" value="${hexToIntelliJ(ui.defaultalt)}" />
    <option name="RIGHT_MARGIN_COLOR" value="${border}" />
    <option name="SCROLL_BAR_THUMB_BORDER" value="${hexToIntelliJ(isDark ? lighten(ui.uibackground, 15) : darken(ui.uibackground, 15))}" />
    <option name="SCROLL_BAR_THUMB_COLOR" value="${hexToIntelliJ(isDark ? lighten(ui.uibackground, 12) : darken(ui.uibackground, 12))}" />
    <option name="SELECTED_INDENT_GUIDE" value="${fgAlt}" />
    <option name="SELECTED_TEARLINE_COLOR" value="${fgAlt}" />
    <option name="SELECTION_BACKGROUND" value="${selection}" />
    <option name="SELECTION_FOREGROUND" />
    <option name="SEPARATOR_ABOVE_COLOR" value="${border}" />
    <option name="SEPARATOR_BELOW_COLOR" value="${border}" />
    <option name="SOFT_WRAP_SIGN_COLOR" value="${fgAlt}" />
    <option name="TEARLINE_COLOR" value="${border}" />
    <option name="VCS_ANNOTATIONS_COLOR_1" value="${addedBg}" />
    <option name="VCS_ANNOTATIONS_COLOR_2" value="${modifiedBg}" />
    <option name="VCS_ANNOTATIONS_COLOR_3" value="${conflictBg}" />
    <option name="VCS_ANNOTATIONS_COLOR_4" value="${deletedBg}" />
    <option name="VCS_ANNOTATIONS_COLOR_5" value="${hexToIntelliJ(ui.defaultalt)}" />
    <option name="VISUAL_INDENT_GUIDE" value="${border}" />
    <option name="WHITESPACES" value="${border}" />
    <option name="WHITESPACES_MODIFIED_LINES_COLOR" value="${modifiedStripe}" />
  </colors>
  <attributes>
    <!-- Default text -->
    <option name="TEXT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
        <option name="BACKGROUND" value="${bg}" />
      </value>
    </option>

    <!-- Comments -->
    <option name="DEFAULT_BLOCK_COMMENT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="DEFAULT_LINE_COMMENT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="DEFAULT_DOC_COMMENT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="DEFAULT_DOC_COMMENT_TAG">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
        <option name="FONT_TYPE" value="3" />
      </value>
    </option>
    <option name="DEFAULT_DOC_COMMENT_TAG_VALUE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="DEFAULT_DOC_MARKUP">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>

    <!-- Keywords -->
    <option name="DEFAULT_KEYWORD">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
      </value>
    </option>

    <!-- Strings -->
    <option name="DEFAULT_STRING">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>
    <option name="DEFAULT_VALID_STRING_ESCAPE">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="DEFAULT_INVALID_STRING_ESCAPE">
      <value>
        <option name="FOREGROUND" value="${l.danger}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>

    <!-- Numbers -->
    <option name="DEFAULT_NUMBER">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>

    <!-- Constants -->
    <option name="DEFAULT_CONSTANT">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>
    <option name="DEFAULT_PREDEFINED_SYMBOL">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>

    <!-- Functions -->
    <option name="DEFAULT_FUNCTION_CALL">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="DEFAULT_FUNCTION_DECLARATION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="DEFAULT_STATIC_METHOD">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>

    <!-- Types / Classes -->
    <option name="DEFAULT_CLASS_NAME">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>
    <option name="DEFAULT_CLASS_REFERENCE">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>
    <option name="DEFAULT_INTERFACE_NAME">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>

    <!-- Type parameters -->
    <option name="TYPE_PARAMETER_NAME_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
      </value>
    </option>

    <!-- Variables -->
    <option name="DEFAULT_LOCAL_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="DEFAULT_GLOBAL_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="DEFAULT_INSTANCE_FIELD">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="DEFAULT_INSTANCE_METHOD">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="DEFAULT_STATIC_FIELD">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>

    <!-- Parameters -->
    <option name="DEFAULT_PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>

    <!-- Decorators / Annotations -->
    <option name="DEFAULT_METADATA">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>

    <!-- Operators -->
    <option name="DEFAULT_OPERATION_SIGN">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>

    <!-- Brackets -->
    <option name="DEFAULT_BRACKETS">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="DEFAULT_PARENTHS">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="DEFAULT_BRACES">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="DEFAULT_DOT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="DEFAULT_COMMA">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="DEFAULT_SEMICOLON">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>

    <!-- Labels -->
    <option name="DEFAULT_LABEL">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>

    <!-- Template language -->
    <option name="DEFAULT_TEMPLATE_LANGUAGE_COLOR">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
      </value>
    </option>

    <!-- Markup (HTML/XML) -->
    <option name="DEFAULT_TAG">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="DEFAULT_ATTRIBUTE">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="DEFAULT_ENTITY">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="HTML_TAG_NAME">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="HTML_ATTRIBUTE_NAME">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="HTML_ATTRIBUTE_VALUE">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>
    <option name="XML_TAG_NAME">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="XML_ATTRIBUTE_NAME">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="XML_ATTRIBUTE_VALUE">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>

    <!-- CSS -->
    <option name="CSS.PROPERTY_NAME">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="CSS.PROPERTY_VALUE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="CSS.TAG_NAME">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
      </value>
    </option>
    <option name="CSS.CLASS_NAME">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>
    <option name="CSS.PSEUDO">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
      </value>
    </option>
    <option name="CSS.FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="CSS.COLOR">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>
    <option name="CSS.NUMBER">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>
    <option name="CSS.URL">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>
    <option name="CSS.IDENT">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>

    <!-- JSON -->
    <option name="JSON.PROPERTY_KEY">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>

    <!-- YAML -->
    <option name="YAML_SCALAR_KEY">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="YAML_SCALAR_VALUE">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>

    <!-- Markdown -->
    <option name="MARKDOWN_HEADER_LEVEL_1">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="MARKDOWN_HEADER_LEVEL_2">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="MARKDOWN_HEADER_LEVEL_3">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="MARKDOWN_HEADER_LEVEL_4">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="MARKDOWN_BOLD">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="MARKDOWN_ITALIC">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="MARKDOWN_CODE_SPAN">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="MARKDOWN_LINK_DESTINATION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="MARKDOWN_LINK_TEXT">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>

    <!-- Diff -->
    <option name="DIFF_INSERTED">
      <value>
        <option name="BACKGROUND" value="${addedBg}" />
      </value>
    </option>
    <option name="DIFF_DELETED">
      <value>
        <option name="BACKGROUND" value="${deletedBg}" />
      </value>
    </option>
    <option name="DIFF_MODIFIED">
      <value>
        <option name="BACKGROUND" value="${modifiedBg}" />
      </value>
    </option>
    <option name="DIFF_CONFLICT">
      <value>
        <option name="BACKGROUND" value="${conflictBg}" />
      </value>
    </option>

    <!-- Search results -->
    <option name="SEARCH_RESULT_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${searchBg}" />
        <option name="ERROR_STRIPE_COLOR" value="${searchBg}" />
      </value>
    </option>
    <option name="WRITE_SEARCH_RESULT_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${searchWriteBg}" />
        <option name="ERROR_STRIPE_COLOR" value="${searchWriteBg}" />
      </value>
    </option>
    <option name="TEXT_SEARCH_RESULT_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${searchBg}" />
        <option name="ERROR_STRIPE_COLOR" value="${searchBg}" />
      </value>
    </option>

    <!-- Matched brace -->
    <option name="MATCHED_BRACE_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${bracketBg}" />
        <option name="FONT_TYPE" value="1" />
      </value>
    </option>
    <option name="UNMATCHED_BRACE_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${l.danger}" />
        <option name="FONT_TYPE" value="1" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>

    <!-- Errors / Warnings -->
    <option name="ERRORS_ATTRIBUTES">
      <value>
        <option name="EFFECT_COLOR" value="${l.danger}" />
        <option name="ERROR_STRIPE_COLOR" value="${l.danger}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="WARNING_ATTRIBUTES">
      <value>
        <option name="EFFECT_COLOR" value="${l.warning}" />
        <option name="ERROR_STRIPE_COLOR" value="${l.warning}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="INFO_ATTRIBUTES">
      <value>
        <option name="EFFECT_COLOR" value="${l.info}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="DEPRECATED_ATTRIBUTES">
      <value>
        <option name="EFFECT_COLOR" value="${fgAlt}" />
        <option name="EFFECT_TYPE" value="5" />
      </value>
    </option>
    <option name="NOT_USED_ELEMENT_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
        <option name="EFFECT_TYPE" value="5" />
      </value>
    </option>
    <option name="WRONG_REFERENCES_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${l.danger}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>

    <!-- Hyperlinks -->
    <option name="HYPERLINK_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
        <option name="EFFECT_COLOR" value="${c.blue}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="FOLLOWED_HYPERLINK_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
        <option name="EFFECT_COLOR" value="${c.purple}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>

    <!-- Injected language fragment -->
    <option name="INJECTED_LANGUAGE_FRAGMENT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>

    <!-- TODO -->
    <option name="TODO_DEFAULT_ATTRIBUTES">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
        <option name="FONT_TYPE" value="3" />
        <option name="ERROR_STRIPE_COLOR" value="${hexToIntelliJ(colors.yellow)}" />
      </value>
    </option>

    <!-- Identifier under caret -->
    <option name="IDENTIFIER_UNDER_CARET_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${hexToIntelliJ(isDark ? lighten(ui.uibackground, 10) : darken(ui.uibackground, 10))}" />
        <option name="ERROR_STRIPE_COLOR" value="${pri}" />
      </value>
    </option>
    <option name="WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES">
      <value>
        <option name="BACKGROUND" value="${hexToIntelliJ(isDark ? lighten(ui.uibackground, 15) : darken(ui.uibackground, 15))}" />
        <option name="ERROR_STRIPE_COLOR" value="${pri}" />
      </value>
    </option>

    <!-- Breadcrumbs -->
    <option name="BREADCRUMBS_CURRENT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="BREADCRUMBS_DEFAULT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
      </value>
    </option>
    <option name="BREADCRUMBS_HOVERED">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="BREADCRUMBS_INACTIVE">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
      </value>
    </option>

    <!-- Console -->
    <option name="CONSOLE_NORMAL_OUTPUT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="CONSOLE_ERROR_OUTPUT">
      <value>
        <option name="FOREGROUND" value="${l.danger}" />
      </value>
    </option>
    <option name="CONSOLE_USER_INPUT">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>
    <option name="CONSOLE_SYSTEM_OUTPUT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
      </value>
    </option>
    <option name="LOG_ERROR_OUTPUT">
      <value>
        <option name="FOREGROUND" value="${l.danger}" />
      </value>
    </option>
    <option name="LOG_WARNING_OUTPUT">
      <value>
        <option name="FOREGROUND" value="${l.warning}" />
      </value>
    </option>

    <!-- Terminal ANSI colors -->
    <option name="TERMINAL_COMMAND_TO_RUN_USING_IDE">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>

    <!-- Kotlin specific -->
    <option name="KOTLIN_FUNCTION_LITERAL_BRACES_AND_ARROW">
      <value>
        <option name="FOREGROUND" value="${fg}" />
      </value>
    </option>
    <option name="KOTLIN_LABEL">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>
    <option name="KOTLIN_NAMED_ARGUMENT">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>

    <!-- Enumerated references -->
    <option name="ENUM_CONST">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>

    <!-- Inline parameter hints -->
    <option name="INLINE_PARAMETER_HINT">
      <value>
        <option name="FOREGROUND" value="${fgAlt}" />
        <option name="BACKGROUND" value="${hexToIntelliJ(ui.defaultalt)}" />
      </value>
    </option>
    <option name="INLINE_PARAMETER_HINT_CURRENT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
        <option name="BACKGROUND" value="${hexToIntelliJ(isDark ? lighten(ui.defaultalt, 10) : darken(ui.defaultalt, 10))}" />
      </value>
    </option>
    <option name="INLINE_PARAMETER_HINT_HIGHLIGHTED">
      <value>
        <option name="FOREGROUND" value="${fg}" />
        <option name="BACKGROUND" value="${hexToIntelliJ(isDark ? lighten(ui.defaultalt, 5) : darken(ui.defaultalt, 5))}" />
      </value>
    </option>

    <!-- Rainbow brackets support -->
    <option name="RAINBOW_COLOR1">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="RAINBOW_COLOR2">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="RAINBOW_COLOR3">
      <value>
        <option name="FOREGROUND" value="${c.yellow}" />
      </value>
    </option>
    <option name="RAINBOW_COLOR4">
      <value>
        <option name="FOREGROUND" value="${c.green}" />
      </value>
    </option>
    <option name="RAINBOW_COLOR5">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>

    <!-- Semantic Highlighting (Java/Kotlin) -->
    <option name="REASSIGNED_LOCAL_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="REASSIGNED_PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="IMPLICIT_ANONYMOUS_CLASS_PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>

    <!-- TypeScript / JavaScript -->
    <option name="JS.GLOBAL_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="JS.LOCAL_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="JS.PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>
    <option name="JS.INSTANCE_MEMBER_FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="JS.GLOBAL_FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="JS.REGEXP">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="TS.TYPE_PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
      </value>
    </option>

    <!-- Python -->
    <option name="PY.BUILTIN_NAME">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="PY.DECORATOR">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>
    <option name="PY.KEYWORD_ARGUMENT">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="PY.PREDEFINED_USAGE">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="PY.SELF_PARAMETER">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="PY.FUNC_DEFINITION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="PY.CLASS_DEFINITION">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>

    <!-- Go -->
    <option name="GO_BUILTIN_FUNCTION_CALL">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="GO_BUILTIN_TYPE_REFERENCE">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
      </value>
    </option>
    <option name="GO_BUILTIN_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.red}" />
      </value>
    </option>
    <option name="GO_EXPORTED_FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="GO_LOCAL_FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="GO_PACKAGE_EXPORTED_VARIABLE">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
    <option name="GO_STRUCT_EXPORTED_MEMBER">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="GO_STRUCT_LOCAL_MEMBER">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="GO_TYPE_REFERENCE">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>

    <!-- Rust -->
    <option name="org.rust.FIELD">
      <value>
        <option name="FOREGROUND" value="${c.orange}" />
      </value>
    </option>
    <option name="org.rust.FUNCTION">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="org.rust.METHOD">
      <value>
        <option name="FOREGROUND" value="${c.blue}" />
      </value>
    </option>
    <option name="org.rust.MACRO">
      <value>
        <option name="FOREGROUND" value="${c.turquoize}" />
      </value>
    </option>
    <option name="org.rust.MUT_BINDING">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
        <option name="EFFECT_TYPE" value="1" />
      </value>
    </option>
    <option name="org.rust.STRUCT">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
      </value>
    </option>
    <option name="org.rust.TRAIT">
      <value>
        <option name="FOREGROUND" value="${c.greenAlt}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="org.rust.TYPE_ALIAS">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
      </value>
    </option>
    <option name="org.rust.LIFETIME">
      <value>
        <option name="FOREGROUND" value="${c.purple}" />
        <option name="FONT_TYPE" value="2" />
      </value>
    </option>
    <option name="org.rust.ATTRIBUTE">
      <value>
        <option name="FOREGROUND" value="${c.pink}" />
      </value>
    </option>

    <!-- PHP -->
    <option name="PHP_VAR">
      <value>
        <option name="FOREGROUND" value="${c.salmon}" />
      </value>
    </option>
  </attributes>
</scheme>
`;
}

// ---------------------------------------------------------------------------
// Main: generate all themes
// ---------------------------------------------------------------------------

const outDir = path.join(__dirname, "..", "src", "main", "resources", "themes");
fs.mkdirSync(outDir, { recursive: true });

const generatedThemes = [];

for (const entry of themeRegistry) {
  // Generate theme JSON
  const themeJson = generateThemeJson(entry);
  const themeJsonPath = path.join(outDir, `${entry.slug}.theme.json`);
  fs.writeFileSync(themeJsonPath, JSON.stringify(themeJson, null, 2) + "\n");

  // Generate editor color scheme XML
  const schemeXml = generateEditorSchemeXml(entry);
  const schemeXmlPath = path.join(outDir, `${entry.slug}.xml`);
  fs.writeFileSync(schemeXmlPath, schemeXml);

  generatedThemes.push(entry);
  console.log(`Generated: ${entry.name} (${entry.slug})`);
}

// Generate theme-list.json for tests
const themeList = generatedThemes.map(e => ({
  slug: e.slug,
  name: e.name,
  dark: !e.light,
  hc: !!e.hc,
  themeFile: `${e.slug}.theme.json`,
  schemeFile: `${e.slug}.xml`,
}));
fs.writeFileSync(
  path.join(outDir, "theme-list.json"),
  JSON.stringify(themeList, null, 2) + "\n"
);

console.log(`\nGenerated ${generatedThemes.length} themes.`);

// Generate plugin.xml theme entries
const themeEntries = generatedThemes.map(e =>
  `      <themeProvider id="dev.jetplugins.beardedtheme.${e.slug}" path="/themes/${e.slug}.theme.json" />`
).join("\n");

console.log("\n--- plugin.xml theme entries ---");
console.log(themeEntries);
