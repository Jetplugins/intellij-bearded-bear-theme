#!/usr/bin/env node

/**
 * Generate Bearded-style SVG file icons for IntelliJ.
 * These are 16x16 SVGs matching the Bearded Icons aesthetic —
 * rounded file shapes with a bold accent color and subtle label.
 */

const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "src", "main", "resources", "icons");
fs.mkdirSync(outDir, { recursive: true });

// Icon definitions: [name, color, label]
const fileIcons = [
  // Languages
  ["java", "#E76F00", "J"],
  ["kotlin", "#7F52FF", "Kt"],
  ["python", "#3776AB", "Py"],
  ["javascript", "#F7DF1E", "JS"],
  ["typescript", "#3178C6", "TS"],
  ["react", "#61DAFB", "Rx"],
  ["react_ts", "#3178C6", "Tx"],
  ["go", "#00ADD8", "Go"],
  ["rust", "#DEA584", "Rs"],
  ["ruby", "#CC342D", "Rb"],
  ["php", "#777BB4", "Ph"],
  ["csharp", "#512BD4", "C#"],
  ["cpp", "#00599C", "C+"],
  ["c", "#A8B9CC", "C"],
  ["c_header", "#A8B9CC", "H"],
  ["cpp_header", "#00599C", "H+"],
  ["swift", "#F05138", "Sw"],
  ["scala", "#DC322F", "Sc"],
  ["clojure", "#5881D8", "Cl"],
  ["elixir", "#6E4A7E", "Ex"],
  ["erlang", "#A90533", "Er"],
  ["haskell", "#5D4F85", "Hs"],
  ["lua", "#000080", "Lu"],
  ["r", "#276DC3", "R"],
  ["dart", "#0175C2", "Da"],
  ["vue", "#4FC08D", "Vu"],
  ["svelte", "#FF3E00", "Sv"],

  // Markup / Config
  ["html", "#E34F26", "◇"],
  ["css", "#1572B6", "◇"],
  ["sass", "#CC6699", "◇"],
  ["less", "#1D365D", "◇"],
  ["stylus", "#333333", "◇"],
  ["xml", "#F16529", "◇"],
  ["svg", "#FFB13B", "◇"],
  ["json", "#F7DF1E", "{ }"],
  ["yaml", "#CB171E", "◇"],
  ["toml", "#9C4121", "◇"],
  ["settings", "#6D8086", "⚙"],
  ["markdown", "#083FA1", "Md"],
  ["text", "#6D8086", "Tx"],
  ["tex", "#3D6117", "TeX"],
  ["pdf", "#E44D26", "Pdf"],

  // Shell
  ["shell", "#4EAA25", ">_"],
  ["powershell", "#012456", "PS"],

  // Data
  ["database", "#336791", "DB"],
  ["csv", "#237346", "Csv"],
  ["graphql", "#E10098", "Gql"],
  ["protobuf", "#4285F4", "Pb"],

  // Build tools
  ["gradle", "#02303A", "Gr"],
  ["groovy", "#4298B8", "Gy"],
  ["maven", "#C71A36", "Mv"],
  ["makefile", "#6D8086", "Mk"],
  ["cmake", "#064F8C", "CM"],
  ["terraform", "#7B42BC", "Tf"],

  // Configs
  ["docker", "#2496ED", "🐳"],
  ["git", "#F05032", "Git"],
  ["editorconfig", "#FEFEFE", "EC"],
  ["prettier", "#F7B93E", "Pr"],
  ["eslint", "#4B32C3", "Es"],
  ["webpack", "#8DD6F9", "Wp"],
  ["vite", "#646CFF", "Vi"],
  ["rollup", "#EC4A3F", "Ro"],
  ["babel", "#F9DC3E", "Bb"],
  ["jest", "#C21325", "Je"],
  ["vitest", "#729B1B", "Vt"],
  ["nodejs", "#339933", "No"],
  ["npm", "#CB3837", "Npm"],
  ["yarn", "#2C8EBB", "Yn"],
  ["pnpm", "#F69220", "Pn"],
  ["nginx", "#009639", "Nx"],

  // Misc
  ["image", "#4CAF50", "🖼"],
  ["archive", "#F9A825", "Zip"],
  ["lock", "#FBC02D", "🔒"],
  ["key", "#F44336", "🔑"],
  ["license", "#D4AF37", "Lic"],
  ["changelog", "#8BC34A", "Ch"],
  ["readme", "#42A5F5", "Rm"],
  ["env", "#FFC107", "Env"],
  ["jupyter", "#F37626", "Jp"],
];

// Folder icons
const folderIcons = [
  ["folder_src", "#42A5F5", "src"],
  ["folder_test", "#66BB6A", "test"],
  ["folder_node", "#8BC34A", "node"],
  ["folder_git", "#F05032", "git"],
  ["folder_github", "#24292E", "gh"],
  ["folder_vscode", "#007ACC", "vs"],
  ["folder_idea", "#FE315D", "idea"],
  ["folder_build", "#FF9800", "build"],
  ["folder_public", "#26C6DA", "pub"],
  ["folder_assets", "#AB47BC", "ast"],
  ["folder_images", "#EC407A", "img"],
  ["folder_fonts", "#7E57C2", "fnt"],
  ["folder_styles", "#1572B6", "css"],
  ["folder_components", "#42A5F5", "cmp"],
  ["folder_pages", "#66BB6A", "pg"],
  ["folder_views", "#26A69A", "vw"],
  ["folder_layouts", "#FF7043", "lay"],
  ["folder_config", "#8D6E63", "cfg"],
  ["folder_lib", "#78909C", "lib"],
  ["folder_utils", "#9E9E9E", "utl"],
  ["folder_hooks", "#7C4DFF", "hk"],
  ["folder_api", "#FF5252", "api"],
  ["folder_routes", "#FFA726", "rte"],
  ["folder_middleware", "#5C6BC0", "mid"],
  ["folder_models", "#26C6DA", "mdl"],
  ["folder_controllers", "#EF5350", "ctl"],
  ["folder_services", "#7E57C2", "svc"],
  ["folder_types", "#3178C6", "typ"],
  ["folder_docs", "#4CAF50", "doc"],
  ["folder_docker", "#2496ED", "dkr"],
  ["folder_scripts", "#4EAA25", "sh"],
  ["folder_resources", "#FF9800", "res"],
  ["folder_i18n", "#00897B", "i18"],
];

function generateFileSvg(color, label) {
  // Bearded-style: rounded file shape with colored header and text label
  const textLabel = label.length > 2 ? label.substring(0, 3) : label;
  const fontSize = textLabel.length === 1 ? "7" : textLabel.length === 2 ? "5.5" : "4.5";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M3 1.5C3 1.22386 3.22386 1 3.5 1H10L13 4V14.5C13 14.7761 12.7761 15 12.5 15H3.5C3.22386 15 3 14.7761 3 14.5V1.5Z" fill="#2d2d2d" stroke="${color}" stroke-width="0.5" stroke-opacity="0.6"/>
  <path d="M10 1L13 4H10.5C10.2239 4 10 3.77614 10 3.5V1Z" fill="${color}" fill-opacity="0.3"/>
  <rect x="3" y="1" width="10" height="3" rx="0" fill="${color}" fill-opacity="0.15"/>
  <text x="8" y="10.5" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central">${escapeXml(textLabel)}</text>
</svg>`;
}

function generateFolderSvg(color, label) {
  const textLabel = label.length > 3 ? label.substring(0, 3) : label;
  const fontSize = textLabel.length <= 2 ? "5" : "4";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M1 3.5C1 3.22386 1.22386 3 1.5 3H6L7.5 4.5H14.5C14.7761 4.5 15 4.72386 15 5V13.5C15 13.7761 14.7761 14 14.5 14H1.5C1.22386 14 1 13.7761 1 13.5V3.5Z" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="0.5" stroke-opacity="0.5"/>
  <path d="M1 3.5C1 3.22386 1.22386 3 1.5 3H6L7.5 4.5H14.5C14.7761 4.5 15 4.72386 15 5V6H1V3.5Z" fill="${color}" fill-opacity="0.35"/>
  <text x="8" y="10.5" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central">${escapeXml(textLabel)}</text>
</svg>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Generate all icons
for (const [name, color, label] of fileIcons) {
  const svg = generateFileSvg(color, label);
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
}

for (const [name, color, label] of folderIcons) {
  const svg = generateFolderSvg(color, label);
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
}

console.log(`Generated ${fileIcons.length} file icons and ${folderIcons.length} folder icons.`);
