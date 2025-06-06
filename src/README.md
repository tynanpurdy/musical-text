# Musical Text Plugin - Module Structure

This directory contains the modular components of the Musical Text plugin, organized by functionality for better maintainability and code organization.

## Module Overview

### `types.ts`
**Type Definitions and Interfaces**
- `SentenceMarkingStyle` enum - Defines the three visual marking styles
- `MusicalTextSettings` interface - Plugin settings structure
- `ColorPalette` interface - Color palette definition
- `MarkdownListMarkerResult` interface - Result type for markdown parsing

### `color-utils.ts`
**Color Processing and Contrast Generation**
- `hexToHsl()` - Converts hex colors to HSL format
- `hslToHex()` - Converts HSL back to hex format  
- `getContrastingTextColor()` - Generates contrasting text colors of the same hue

Key Features:
- Maintains color harmony by preserving hue
- Ensures optimal contrast ratios for accessibility
- Automatically adjusts lightness for readability

### `sentence-detection.ts`
**Text Analysis and Markdown Processing**
- `computeDecorations()` - Main function that analyzes text and creates decorations
- `detectMarkdownListMarker()` - Identifies and parses markdown list syntax
- `countWords()` - Counts words while excluding markdown syntax
- `getClassForSentence()` - Maps word counts to CSS classes

Handles:
- Traditional sentence punctuation (. ! ?)
- Line breaks and paragraph breaks
- Markdown lists (ordered, unordered, checkboxes)
- Precise positioning without marker interference

### `settings.ts`
**Configuration and UI**
- `COLOR_PALETTES` - Predefined color schemes from popular editors
- `DEFAULT_SETTINGS` - Default plugin configuration
- `SentenceHighlighterSettingTab` - Settings UI implementation

Features:
- 11 built-in color palettes (Gruvbox, Solarized, Tokyo Night, etc.)
- Threshold configuration for sentence lengths
- Color customization with palette reset functionality
- Marking style selection (highlighting, text color, underlining)

## Architecture Benefits

### Separation of Concerns
Each module has a single, well-defined responsibility:
- **Types**: Central type definitions
- **Color Utils**: Color manipulation logic
- **Sentence Detection**: Text parsing and analysis
- **Settings**: Configuration and UI
- **Main**: Plugin orchestration and CodeMirror integration

### Maintainability
- Easier to locate and modify specific functionality
- Reduced file size for easier navigation
- Clear module boundaries prevent coupling
- Individual modules can be tested independently

### Extensibility
- New marking styles can be added by updating types and main.ts
- Additional color palettes easily added to settings.ts
- Sentence detection can be enhanced without touching other modules
- Color algorithms can be improved independently

## Import Structure

```typescript
// Main plugin imports modular components
import { MusicalTextSettings, SentenceMarkingStyle } from "./src/types";
import { getContrastingTextColor } from "./src/color-utils";
import { computeDecorations } from "./src/sentence-detection";
import { DEFAULT_SETTINGS, SentenceHighlighterSettingTab } from "./src/settings";
```

## Development Guidelines

### Adding New Features
1. **New marking styles**: Update `SentenceMarkingStyle` enum in types.ts, add case in main.ts
2. **New color palettes**: Add to `COLOR_PALETTES` in settings.ts
3. **Enhanced detection**: Modify functions in sentence-detection.ts
4. **Color improvements**: Update algorithms in color-utils.ts

### Testing
Each module can be tested independently:
- Color utils can be tested with various hex inputs
- Sentence detection can be tested with sample markdown
- Settings can be tested for UI behavior
- Types provide compile-time safety

This modular structure ensures the Musical Text plugin remains maintainable and extensible as it grows in functionality.