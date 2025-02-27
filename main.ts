import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Editor,
	MarkdownView,
	setIcon,
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
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
	shortThreshold: number;
	longThreshold: number;
	// We'll keep a global default for new editors; individual editors override this.
	defaultHighlightingEnabled: boolean;
}

/**
 * Default settings for the Musical Text plugin.
 * Provides initial values for colors and thresholds.
 */
const DEFAULT_SETTINGS: MusicalTextSettings = {
	shortSentenceColor: "#e3f2fd", // light blue
	mediumSentenceColor: "#fff3e0", // light orange
	longSentenceColor: "#ffebee", // light red
	shortThreshold: 3, // words
	longThreshold: 7, // words
	defaultHighlightingEnabled: false,
};

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
					range.to
				);
				const decorations = computeDecorations(
					visibleText,
					plugin.settings,
					range.from
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
			name: "Toggle Sentence Highlighting (Current Editor)",
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
			})
		);

		// Initialize the active editor's highlighting state to the default.
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const cm: EditorView = (activeView.editor as any).cm;
			this.editorHighlightingMap.set(
				cm,
				this.settings.defaultHighlightingEnabled
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
					range.to
				);
				const decorations = computeDecorations(
					visibleText,
					this.settings,
					range.from
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
				range.from
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
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.registerStyles(); // Update styles if settings changed.
	}

	private registerStyles() {
		const existingStyle = document.getElementById(
			"sentence-highlighter-styles"
		);
		if (existingStyle) {
			existingStyle.remove();
		}
		const style = document.createElement("style");
		style.id = "sentence-highlighter-styles";
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
			.sh-short { background-color: ${this.settings.shortSentenceColor}; }
			.sh-medium { background-color: ${this.settings.mediumSentenceColor}; }
			.sh-long { background-color: ${this.settings.longSentenceColor}; }
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
	offset = 0
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
	settings: MusicalTextSettings
): string {
	if (wordCount <= settings.shortThreshold) {
		return "sh-short";
	} else if (wordCount >= settings.longThreshold) {
		return "sh-long";
	}
	return "sh-medium";
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
				"Number of words or less to be considered a short sentence"
			)
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(this.plugin.settings.shortThreshold.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue) && numValue > 0) {
							this.plugin.settings.shortThreshold = numValue;
							await this.plugin.saveSettings();
						}
					})
			);
		new Setting(containerEl)
			.setName("Long sentence threshold")
			.setDesc("Number of words or more to be considered a long sentence")
			.addText((text) =>
				text
					.setPlaceholder("25")
					.setValue(this.plugin.settings.longThreshold.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (!isNaN(numValue) && numValue > 0) {
							this.plugin.settings.longThreshold = numValue;
							await this.plugin.saveSettings();
						}
					})
			);
		new Setting(containerEl)
			.setName("Short sentence color")
			.setDesc("Color for sentences below the short threshold")
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.shortSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.shortSentenceColor = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Medium sentence color")
			.setDesc("Color for sentences between thresholds")
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.mediumSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.mediumSentenceColor = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Long sentence color")
			.setDesc("Color for sentences above the long threshold")
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.longSentenceColor)
					.onChange(async (value) => {
						this.plugin.settings.longSentenceColor = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
