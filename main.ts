import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Editor,
	MarkdownView,
	setIcon,
	Notice,
} from "obsidian";
import { EditorView, Decoration } from "@codemirror/view";
import {
	StateField,
	StateEffect,
	RangeSet,
	RangeSetBuilder,
} from "@codemirror/state";

/**
 * Settings interface for the Musical Text plugin.
 * Defines color schemes and thresholds for sentence highlighting.
 */
interface MusicalTextSettings {
	colorPalette: string;
	miniSentenceColor: string;
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
	shortThreshold: number;
	mediumThreshold: number;
	longThreshold: number;
	defaultHighlightingEnabled: boolean;
}

interface ColorPalette {
	name: string;
	miniSentenceColor: string;
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
}

/**
 * Color palettes from popular code editors
 */
const COLOR_PALETTES: Record<string, ColorPalette> = {
	default: {
		name: "Default",
		miniSentenceColor: "#AF3029",
		shortSentenceColor: "#BC5215",
		mediumSentenceColor: "#AD8301",
		longSentenceColor: "#66800B",
	},
	gruvbox: {
		name: "Gruvbox",
		miniSentenceColor: "#fb4934", // red
		shortSentenceColor: "#fe8019", // orange
		mediumSentenceColor: "#fabd2f", // yellow
		longSentenceColor: "#b8bb26", // green
	},
	gruvboxDark: {
		name: "Gruvbox Dark",
		miniSentenceColor: "#cc241d", // dark red
		shortSentenceColor: "#d65d0e", // dark orange
		mediumSentenceColor: "#d79921", // dark yellow
		longSentenceColor: "#98971a", // dark green
	},
	solarizedLight: {
		name: "Solarized Light",
		miniSentenceColor: "#dc322f", // red
		shortSentenceColor: "#cb4b16", // orange
		mediumSentenceColor: "#b58900", // yellow
		longSentenceColor: "#859900", // green
	},
	solarizedDark: {
		name: "Solarized Dark",
		miniSentenceColor: "#dc322f", // red
		shortSentenceColor: "#cb4b16", // orange
		mediumSentenceColor: "#b58900", // yellow
		longSentenceColor: "#859900", // green
	},
	tokyoNight: {
		name: "Tokyo Night",
		miniSentenceColor: "#f7768e", // red
		shortSentenceColor: "#ff9e64", // orange
		mediumSentenceColor: "#e0af68", // yellow
		longSentenceColor: "#9ece6a", // green
	},
	tokyoNightStorm: {
		name: "Tokyo Night Storm",
		miniSentenceColor: "#f7768e", // red
		shortSentenceColor: "#ff9e64", // orange
		mediumSentenceColor: "#e0af68", // yellow
		longSentenceColor: "#9ece6a", // green
	},
	dracula: {
		name: "Dracula",
		miniSentenceColor: "#ff5555", // red
		shortSentenceColor: "#ffb86c", // orange
		mediumSentenceColor: "#f1fa8c", // yellow
		longSentenceColor: "#50fa7b", // green
	},
	nord: {
		name: "Nord",
		miniSentenceColor: "#bf616a", // red
		shortSentenceColor: "#d08770", // orange
		mediumSentenceColor: "#ebcb8b", // yellow
		longSentenceColor: "#a3be8c", // green
	},
	oneDark: {
		name: "One Dark",
		miniSentenceColor: "#e06c75", // red
		shortSentenceColor: "#d19a66", // orange
		mediumSentenceColor: "#e5c07b", // yellow
		longSentenceColor: "#98c379", // green
	},
	catppuccin: {
		name: "Catppuccin",
		miniSentenceColor: "#f38ba8", // red
		shortSentenceColor: "#fab387", // orange
		mediumSentenceColor: "#f9e2af", // yellow
		longSentenceColor: "#a6e3a1", // green
	},
	monokai: {
		name: "Monokai",
		miniSentenceColor: "#f92672", // red
		shortSentenceColor: "#fd971f", // orange
		mediumSentenceColor: "#e6db74", // yellow
		longSentenceColor: "#a6e22e", // green
	},
};

/**
 * Default settings for the Musical Text plugin.
 * Provides initial values for colors and thresholds.
 */
const DEFAULT_SETTINGS: MusicalTextSettings = {
	colorPalette: "default",
	miniSentenceColor: COLOR_PALETTES.default.miniSentenceColor,
	shortSentenceColor: COLOR_PALETTES.default.shortSentenceColor,
	mediumSentenceColor: COLOR_PALETTES.default.mediumSentenceColor,
	longSentenceColor: COLOR_PALETTES.default.longSentenceColor,
	shortThreshold: 5, // words
	mediumThreshold: 7, // words
	longThreshold: 9, // words
	defaultHighlightingEnabled: false,
};

/**
 * Color utility functions for generating contrasting text colors
 * 
 * This system automatically generates text colors that maintain good contrast
 * with any background color while preserving the same hue. This ensures
 * readability across all color palettes and custom color selections.
 * 
 * Examples:
 * - Background: #ff5555 (bright red) → Text: #4d0000 (dark red)
 * - Background: #2d2d2d (dark gray) → Text: #e0e0e0 (light gray)
 * - Background: #fabd2f (bright yellow) → Text: #3d2900 (dark yellow)
 */

/**
 * Converts a hex color to HSL values
 * @param hex The hex color string (e.g., "#ff5555")
 * @returns Object with h, s, l values
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
	// Remove # if present
	hex = hex.replace('#', '');
	
	// Convert to RGB
	const r = parseInt(hex.substr(0, 2), 16) / 255;
	const g = parseInt(hex.substr(2, 2), 16) / 255;
	const b = parseInt(hex.substr(4, 2), 16) / 255;
	
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	
	return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL values to hex color
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
	h = h / 360;
	s = s / 100;
	l = l / 100;
	
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1/6) return p + (q - p) * 6 * t;
		if (t < 1/2) return q;
		if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;
	};
	
	let r, g, b;
	
	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}
	
	const toHex = (c: number) => {
		const hex = Math.round(c * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};
	
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a contrasting text color of the same hue for optimal readability
 * 
 * The algorithm works by:
 * 1. Converting the background color from hex to HSL (Hue, Saturation, Lightness)
 * 2. Preserving the hue to maintain color harmony
 * 3. Adjusting lightness for contrast:
 *    - Light backgrounds (>50% lightness) get dark text (~15-25% lightness)
 *    - Dark backgrounds (≤50% lightness) get light text (~75-85% lightness)
 * 4. Slightly boosting saturation for better visibility
 * 
 * @param backgroundColor The background color in hex format (e.g., "#ff5555")
 * @returns A contrasting text color in hex format that maintains readability
 */
function getContrastingTextColor(backgroundColor: string): string {
	const hsl = hexToHsl(backgroundColor);
	
	// For light backgrounds (lightness > 50%), use a much darker version
	// For dark backgrounds (lightness <= 50%), use a much lighter version
	let newLightness: number;
	if (hsl.l > 50) {
		// Light background - use dark text (15-25% lightness)
		newLightness = Math.max(15, hsl.l - 60);
	} else {
		// Dark background - use light text (75-85% lightness)
		newLightness = Math.min(85, hsl.l + 60);
	}
	
	// Increase saturation slightly for better visibility while maintaining hue
	const adjustedSaturation = Math.min(100, hsl.s * 1.1);
	
	return hslToHex(hsl.h, adjustedSaturation, newLightness);
}

/**
 * CodeMirror state effect for updating sentence highlighting decorations.
 * Used to dispatch decoration updates to the editor view.
 */
const sentenceHighlightEffect = StateEffect.define<RangeSet<Decoration>>();

/**
 * CodeMirror state field that maintains the current set of sentence decorations.
 * Handles creation, updates, and provides decorations to the editor view.
 */
const sentenceHighlighterField = StateField.define<RangeSet<Decoration>>({
	create: () => RangeSet.empty,
	update(decorations, tr) {
		// If our effect is dispatched, use its new decorations.
		const effects = tr.effects.filter((e) => e.is(sentenceHighlightEffect));
		if (effects.length) {
			return effects[0].value;
		}
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field),
});

/**
 * Creates a CodeMirror extension that updates sentence highlighting in real-time.
 * Responds to document changes and viewport updates to maintain accurate highlighting.
 * @param plugin Reference to the plugin instance for accessing settings and state
 * @returns An EditorView.updateListener extension
 */
function liveHighlightExtension(plugin: MusicalTextPlugin) {
	return EditorView.updateListener.of((update) => {
		// Look up the current view's enabled state.
		const enabled = plugin.editorHighlightingMap.get(update.view);
		if (!enabled) return;

		// Update decorations if the document changed OR the viewport changed
		if (update.docChanged || update.viewportChanged) {
			const builder = new RangeSetBuilder<Decoration>();

			// Process only visible ranges
			for (const range of update.view.visibleRanges) {
				const visibleText = update.state.doc.sliceString(
					range.from,
					range.to,
				);
				const decorations = computeDecorations(
					visibleText,
					plugin.settings,
					range.from,
				);

				const iter = decorations.iter();
				while (iter.value) {
					builder.add(iter.from, iter.to, iter.value);
					iter.next();
				}
			}

			const fullDecorations = builder.finish();
			update.view.dispatch({
				effects: sentenceHighlightEffect.of(fullDecorations),
			});
		}
	});
}

/**
 * Main plugin class for the Musical Text feature.
 * Handles initialization, state management, and editor interactions for sentence highlighting.
 */
export default class MusicalTextPlugin extends Plugin {
	settings: MusicalTextSettings;
	// This WeakMap holds the highlighting state (true/false) for each CodeMirror view.
	editorHighlightingMap: WeakMap<EditorView, boolean>;

	async onload() {
		await this.loadSettings();
		this.editorHighlightingMap = new WeakMap();

		// Add a status bar item that reflects the state of the active editor.
		const statusBarItem = this.addStatusBarItem();
		this.updateStatusBar(statusBarItem);
		statusBarItem.addClass("sentence-highlighter-status");
		statusBarItem.addEventListener("click", () => {
			this.toggleHighlighting(statusBarItem);
		});

		// Register a command to toggle highlighting in the active editor.
		this.addCommand({
			id: "toggle-sentence-highlighting",
			name: "Toggle musical text highlighting",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.toggleHighlighting(statusBarItem);
			},
		});

		// Register our CodeMirror extensions for all editors.
		// This attaches the decoration field and live update listener.
		this.registerEditorExtension([
			sentenceHighlighterField,
			liveHighlightExtension(this),
		]);

		this.registerStyles();
		this.addSettingTab(new SentenceHighlighterSettingTab(this.app, this));

		// When switching views, update the status bar and refresh highlighting for the active editor.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				this.updateStatusBar(statusBarItem);
				if (activeView) {
					const cm: EditorView = (activeView.editor as any).cm;
					const enabled = this.editorHighlightingMap.get(cm) || false;
					if (enabled) {
						this.refreshHighlighting(activeView.editor);
					} else {
						// Ensure that if highlighting is disabled, we clear any decorations.
						cm.dispatch({
							effects: sentenceHighlightEffect.of(RangeSet.empty),
						});
					}
				}
			}),
		);

		// Initialize the active editor's highlighting state to the default.
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const cm: EditorView = (activeView.editor as any).cm;
			this.editorHighlightingMap.set(
				cm,
				this.settings.defaultHighlightingEnabled,
			);
			if (this.settings.defaultHighlightingEnabled) {
				this.refreshHighlighting(activeView.editor);
			}
		}
	}

	/**
	 * Returns the active editor from the active MarkdownView.
	 */
	private getEditorFromActiveView(): Editor | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView ? activeView.editor : null;
	}

	/**
	 * Helper method to get the EditorView from either an Editor instance or from the active view
	 * @param editor Optional editor instance. If not provided, gets from active view
	 * @returns EditorView instance or null if not found
	 */
	private getEditorView(editor?: Editor): EditorView | null {
		if (editor) {
			return (editor as any).cm;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView ? (activeView.editor as any).cm : null;
	}

	/**
	 * Updates the highlighting state for a given editor.
	 * @param editor The editor whose state to update.
	 * @param newState The new highlighting state.
	 */
	private updateHighlightingState(editor: Editor, newState: boolean): void {
		const cm = this.getEditorView(editor);
		if (cm) {
			this.editorHighlightingMap.set(cm, newState);
		}
	}

	/**
	 * Applies highlighting or clears decorations based on the provided state.
	 * @param editor The editor to update.
	 * @param state True to refresh highlighting; false to clear decorations.
	 */
	private applyHighlightingToEditor(editor: Editor, state: boolean): void {
		const cm = this.getEditorView(editor);
		if (!cm) return;

		if (state) {
			// Compute initial decorations for visible ranges
			const builder = new RangeSetBuilder<Decoration>();
			for (const range of cm.visibleRanges) {
				const visibleText = cm.state.doc.sliceString(
					range.from,
					range.to,
				);
				const decorations = computeDecorations(
					visibleText,
					this.settings,
					range.from,
				);

				const iter = decorations.iter();
				while (iter.value) {
					builder.add(iter.from, iter.to, iter.value);
					iter.next();
				}
			}

			cm.dispatch({
				effects: sentenceHighlightEffect.of(builder.finish()),
			});
		} else {
			cm.dispatch({
				effects: sentenceHighlightEffect.of(RangeSet.empty),
			});
		}
	}

	/**
	 * Toggles highlighting only for the active editor.
	 */
	private async toggleHighlighting(statusBarItem: HTMLElement) {
		const editor = this.getEditorFromActiveView();
		if (!editor) return;
		const cm: EditorView = (editor as any).cm;
		const currentState = this.editorHighlightingMap.get(cm) || false;
		const newState = !currentState;

		this.updateHighlightingState(editor, newState);
		this.updateStatusBar(statusBarItem);
		this.applyHighlightingToEditor(editor, newState);
	}

	/**
	 * Recomputes and dispatches the updated decorations for the visible ranges of the given editor.
	 */
	private refreshHighlighting(editor: Editor) {
		const cm = this.getEditorView(editor);
		if (!cm) return;

		const builder = new RangeSetBuilder<Decoration>();
		// Only process visible ranges
		for (const range of cm.visibleRanges) {
			const visibleText = cm.state.doc.sliceString(range.from, range.to);
			const decorations = computeDecorations(
				visibleText,
				this.settings,
				range.from,
			);
			// Merge decorations from this visible range into our builder.
			const iter = decorations.iter();
			while (iter.value) {
				builder.add(iter.from, iter.to, iter.value);
				iter.next();
			}
		}
		const fullDecorations = builder.finish();
		cm.dispatch({ effects: sentenceHighlightEffect.of(fullDecorations) });
	}

	/**
	 * Refreshes highlighting in all open editors that have highlighting enabled
	 */
	private refreshAllActiveHighlighting() {
		// Update CSS styles first
		this.registerStyles();
		
		// Refresh highlighting in all open editors
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const editor = leaf.view.editor;
				const cm = this.getEditorView(editor);
				if (cm && this.editorHighlightingMap.get(cm)) {
					this.refreshHighlighting(editor);
				}
			}
		});
	}

	private updateStatusBar(statusBarItem: HTMLElement) {
		statusBarItem.empty();
		setIcon(statusBarItem, "list-music");

		const cm = this.getEditorView();
		const enabled = cm
			? this.editorHighlightingMap.get(cm) || false
			: false;

		statusBarItem.title =
			"Click to toggle sentence highlighting for this editor";
		statusBarItem.toggleClass("is-active", enabled);
	}

	onunload() {
		const cm = this.getEditorView();
		if (cm) {
			cm.dispatch({
				effects: sentenceHighlightEffect.of(RangeSet.empty),
			});
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshAllActiveHighlighting(); // Update styles and refresh all active highlighting
	}

	private registerStyles() {
		const existingStyle = document.getElementById(
			"sentence-highlighter-styles",
		);
		if (existingStyle) {
			existingStyle.remove();
		}
		const style = document.createElement("style");
		style.id = "sentence-highlighter-styles";
		
		// Generate contrasting text colors for each background color
		// This ensures optimal readability while maintaining color harmony
		const miniTextColor = getContrastingTextColor(this.settings.miniSentenceColor);
		const shortTextColor = getContrastingTextColor(this.settings.shortSentenceColor);
		const mediumTextColor = getContrastingTextColor(this.settings.mediumSentenceColor);
		const longTextColor = getContrastingTextColor(this.settings.longSentenceColor);
		
		style.textContent = `
			.sentence-highlighter-status {
				cursor: pointer;
				opacity: 0.8;
				transition: opacity 0.1s ease-in-out;
			}
			.sentence-highlighter-status:hover {
				opacity: 1;
			}
			.sentence-highlighter-status.is-active {
				color: var(--interactive-accent);
			}
			.sh-mini { 
				background-color: ${this.settings.miniSentenceColor}; 
				color: ${miniTextColor};
				border-radius: 3px;
				padding: 1px 2px;
			}
			.sh-short { 
				background-color: ${this.settings.shortSentenceColor}; 
				color: ${shortTextColor};
				border-radius: 3px;
				padding: 1px 2px;
			}
			.sh-medium { 
				background-color: ${this.settings.mediumSentenceColor}; 
				color: ${mediumTextColor};
				border-radius: 3px;
				padding: 1px 2px;
			}
			.sh-long { 
				background-color: ${this.settings.longSentenceColor}; 
				color: ${longTextColor};
				border-radius: 3px;
				padding: 1px 2px;
			}
		`;
		document.head.appendChild(style);
	}
}

/**
 * Analyzes text and creates decorations for sentence highlighting.
 * Uses regex to identify sentence boundaries and applies appropriate styling based on word count.
 * @param text The text content to analyze
 * @param settings Plugin settings containing thresholds and styles
 * @param offset Position offset to adjust decoration positions
 * @returns A RangeSet containing the computed decorations
 */
function computeDecorations(
	text: string,
	settings: MusicalTextSettings,
	offset = 0,
): RangeSet<Decoration> {
	const builder = new RangeSetBuilder<Decoration>();
	// Use regex.exec to capture sentence boundaries
	const regex = /[^.!?]+[.!?]+/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		const sentence = match[0];
		const start = match.index + offset;
		const end = start + sentence.length;
		const wordCount = countWords(sentence);
		const className = getClassForSentence(wordCount, settings);
		if (className) {
			builder.add(start, end, Decoration.mark({ class: className }));
		}
	}
	return builder.finish();
}

/**
 * Counts the number of words in a sentence using word boundary matching.
 * @param sentence The sentence to analyze
 * @returns Number of words found in the sentence
 */
function countWords(sentence: string): number {
	return (sentence.match(/\b\w+\b/g) || []).length;
}

/**
 * Determines the appropriate CSS class for a sentence based on its word count.
 * @param wordCount Number of words in the sentence
 * @param settings Plugin settings containing thresholds
 * @returns CSS class name for styling the sentence
 */
function getClassForSentence(
	wordCount: number,
	settings: MusicalTextSettings,
): string {
	if (wordCount < settings.shortThreshold) {
		return "sh-mini";
	} else if (wordCount <= settings.mediumThreshold) {
		return "sh-short";
	} else if (wordCount <= settings.longThreshold) {
		return "sh-medium";
	} else {
		return "sh-long";
	}
}

/**
 * Settings tab implementation for the Musical Text plugin.
 * Provides UI for configuring sentence thresholds and highlight colors.
 */
class SentenceHighlighterSettingTab extends PluginSettingTab {
	plugin: MusicalTextPlugin;
	constructor(app: App, plugin: MusicalTextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Short sentence threshold")
			.setDesc(
				"Number of words or less to be considered a short sentence",
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default threshold")
					.onClick(async () => {
						this.plugin.settings.shortThreshold =
							DEFAULT_SETTINGS.shortThreshold;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.shortThreshold.toString())
					.setValue(this.plugin.settings.shortThreshold.toString())
					.onChange(async (value) => {
						if (value == "") {
							this.plugin.settings.shortThreshold =
								DEFAULT_SETTINGS.shortThreshold;
							await this.plugin.saveSettings();
							return;
						}
						const numValue = parseInt(value);
						if (isNaN(numValue) || numValue <= 0) {
							new Notice("Short threshold must be a positive number. Reverting to previous value.");
							this.display(); // Revert to previous value by refreshing
							return;
						}
						this.plugin.settings.shortThreshold = numValue;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Medium sentence threshold")
			.setDesc(
				"Number of words between short and long thresholds to be considered a medium sentence",
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default threshold")
					.onClick(async () => {
						this.plugin.settings.mediumThreshold =
							DEFAULT_SETTINGS.mediumThreshold;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.mediumThreshold.toString())
					.setValue(this.plugin.settings.mediumThreshold.toString())
					.onChange(async (value) => {
						if (value == "") {
							this.plugin.settings.mediumThreshold =
								DEFAULT_SETTINGS.mediumThreshold;
							await this.plugin.saveSettings();
							return;
						}
						const numValue = parseInt(value);
						if (isNaN(numValue) || numValue <= 0) {
							new Notice("Medium threshold must be a positive number. Reverting to previous value.");
							this.display(); // Revert to previous value by refreshing
							return;
						}
						this.plugin.settings.mediumThreshold = numValue;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Long sentence threshold")
			.setDesc("Number of words or more to be considered a long sentence")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default threshold")
					.onClick(async () => {
						this.plugin.settings.longThreshold =
							DEFAULT_SETTINGS.longThreshold;
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.longThreshold.toString())
					.setValue(this.plugin.settings.longThreshold.toString())
					.onChange(async (value) => {
						if (value == "") {
							this.plugin.settings.longThreshold =
								DEFAULT_SETTINGS.longThreshold;
							await this.plugin.saveSettings();
							return;
						}
						const numValue = parseInt(value);
						if (isNaN(numValue) || numValue <= 0) {
							new Notice("Long threshold must be a positive number. Reverting to previous value.");
							this.display(); // Revert to previous value by refreshing
							return;
						}
						this.plugin.settings.longThreshold = numValue;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Color Palette")
			.setDesc("Choose from popular code editor color schemes")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default palette")
					.onClick(async () => {
						this.plugin.settings.colorPalette =
							DEFAULT_SETTINGS.colorPalette;
						this.applyPalette(DEFAULT_SETTINGS.colorPalette);
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addDropdown((dropdown) => {
				Object.keys(COLOR_PALETTES).forEach((key) => {
					dropdown.addOption(
						key,
						COLOR_PALETTES[key as keyof typeof COLOR_PALETTES].name,
					);
				});
				dropdown
					.setValue(this.plugin.settings.colorPalette)
					.onChange(async (value) => {
						this.plugin.settings.colorPalette = value;
						this.applyPalette(value);
						await this.plugin.saveSettings();
						this.display();
					});
			});
		new Setting(containerEl)
			.setName("Mini sentence color")
			.setDesc("Color for sentences below the short threshold")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to palette color")
					.onClick(this.createColorResetHandler("miniSentenceColor")),
			)
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.miniSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.miniSentenceColor = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Short sentence color")
			.setDesc("Color for sentences below the short threshold")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to palette color")
					.onClick(
						this.createColorResetHandler("shortSentenceColor"),
					),
			)
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.shortSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.shortSentenceColor = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Medium sentence color")
			.setDesc("Color for sentences between thresholds")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to palette color")
					.onClick(
						this.createColorResetHandler("mediumSentenceColor"),
					),
			)
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.mediumSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.mediumSentenceColor = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Long sentence color")
			.setDesc("Color for sentences above the long threshold")
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to palette color")
					.onClick(this.createColorResetHandler("longSentenceColor")),
			)
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.longSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.longSentenceColor = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private applyPalette(paletteKey: string) {
		const palette =
			COLOR_PALETTES[paletteKey as keyof typeof COLOR_PALETTES];
		if (palette) {
			this.plugin.settings.miniSentenceColor = palette.miniSentenceColor;
			this.plugin.settings.shortSentenceColor =
				palette.shortSentenceColor;
			this.plugin.settings.mediumSentenceColor =
				palette.mediumSentenceColor;
			this.plugin.settings.longSentenceColor = palette.longSentenceColor;
		}
	}

	private createColorResetHandler(
		colorProperty: keyof Pick<
			MusicalTextSettings,
			| "miniSentenceColor"
			| "shortSentenceColor"
			| "mediumSentenceColor"
			| "longSentenceColor"
		>,
	) {
		return async () => {
			const palette =
				COLOR_PALETTES[
					this.plugin.settings
						.colorPalette as keyof typeof COLOR_PALETTES
				];
			if (palette) {
				this.plugin.settings[colorProperty] = palette[colorProperty];
				await this.plugin.saveSettings();
				this.display();
			}
		};
	}
}
