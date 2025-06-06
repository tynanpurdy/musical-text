# Musical Text

Get immediate visual feedback about your sentence variety while writing in Obsidian. This plugin highlights sentences based on their length, helping you create more engaging and rhythmic prose.

![Demo of Musical Text plugin](imgs/demo.gif)

## Features

- Real-time sentence marking as you type
- Intelligent sentence detection that respects:
  - Traditional punctuation (periods, exclamations, questions)
  - Line breaks (single line endings) - perfect for poetry and lists
  - Paragraph breaks (double line breaks) - ideal for prose and documentation
  - Markdown list markers (-, *, +, numbers, checkboxes) are excluded from highlighting
  - Works seamlessly with Markdown content and various writing styles
  - Excludes whitespace from highlighting to keep spaces between sentences clean
- Three visual marking styles:
  - **Highlighting**: Background colors with automatic contrasting text
  - **Text Color**: Colored text with no background
  - **Color Underlining**: Colored underlines with original text
- Color-coded visualization of sentence lengths:
  - Short sentences
  - Medium-length sentences
  - Long sentences
- Automatic contrasting text colors that maintain the same hue for optimal readability (highlighting mode)
- Works only with visible text for better performance
- Toggle highlighting on/off with status bar button or command
- Customizable sentence length thresholds
- Customizable highlight colors

## How to Use

1. Install the plugin from Obsidian's Community Plugins
2. Enable the plugin in Settings → Community Plugins
3. Start writing! Sentences will be automatically highlighted based on their length
4. Toggle highlighting using:
   - The status bar button (highlighter icon)
   - The command palette (`Cmd/Ctrl + P` → "Toggle musical text highlighting")

## Configuration

You can customize the plugin in Settings → Musical Text:

- **Sentence Length Thresholds**
  - **Short**: 1 to (medium-1) words via slider (default: 5)
  - **Medium**: (short+1) to (long-1) words via slider (default: 7) 
  - **Long**: Minimum of (medium+1) words via text input (default: 9)
  - Smart validation prevents impossible threshold combinations
  - Non-aggressive validation allows complete typing before validation

- **Colors**
  - Customize colors for each sentence length category
  - Automatic contrasting text colors generated for optimal readability (highlighting mode)
  - Colors maintain the same hue while ensuring proper contrast
  - Default colors provided for light and dark themes

## Why Use Musical Text?

Good writing has rhythm. Like music, prose benefits from variation in length and structure. This plugin helps you:

- Identify patterns in your writing
- Spot areas where sentence variety could be improved
- Develop a more natural writing flow
- Work with any writing style (prose, poetry, technical docs, lists)
- Respect your natural writing boundaries beyond just punctuation
- Clean highlighting of markdown lists without visual clutter from markers

## Markdown Support

The plugin intelligently handles markdown syntax:

### List Detection
- **Unordered lists**: `- item`, `* item`, `+ item`
- **Ordered lists**: `1. item`, `2. item`, `10. item`
- **Checkboxes**: `- [ ] task`, `- [x] done`, `- [X] complete`
- **Nested lists**: Properly handles indented list structures
- **List markers excluded**: Only the actual content text is highlighted, not the markers

### Benefits
- Clean visual appearance without cluttered markers
- Accurate word counting (excludes syntax)
- Works with all indentation levels
- Supports mixed list types

## Smart Color Contrast

In highlighting mode, the plugin automatically generates text colors that:
- Maintain the same hue as the background color for visual harmony
- Provide optimal contrast for readability
- Work with any color palette or custom color selection
- Ensure accessibility across light and dark themes

## About

Read about the development process in [my blog post](https://blog.tynanpurdy.com/2025/02/11/i-made-the-write-with.html).

## Support

- Report issues on [GitHub](link-to-your-repo)
- Follow development updates on [Bluesky](https://bsky.app/profile/tynanpurdy.com) or [Blog](https://blog.tynanpurdy.com)

## License

MIT License - see LICENSE file for details
