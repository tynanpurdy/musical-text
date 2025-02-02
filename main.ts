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

interface SentenceHighlighterSettings {
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
	shortThreshold: number;
	longThreshold: number;
	// We'll keep a global default for new editors; individual editors override this.
	defaultHighlightingEnabled: boolean;
}

const DEFAULT_SETTINGS: SentenceHighlighterSettings = {
	shortSentenceColor: "#e3f2fd", // light blue
	mediumSentenceColor: "#fff3e0", // light orange
	longSentenceColor: "#ffebee", // light red
	shortThreshold: 10, // words
	longThreshold: 25, // words
	defaultHighlightingEnabled: false,
};

/**
 * CODEMIRROR EXTENSIONS
 * 
 * 1. A StateField that holds our current decoration set.
 * 2. A StateEffect to update that set.
 */
const sentenceHighlightEffect = StateEffect.define<RangeSet<Decoration>>();
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
 * A live update extension that recalculates decorations on document changes.
 * Note: It consults a per-editor state (a WeakMap) to see whether highlighting is enabled.
 */
function liveHighlightExtension(plugin: SentenceHighlighterPlugin) {
	return EditorView.updateListener.of((update) => {
		// Look up the current view's enabled state.
		const enabled = plugin.editorHighlightingMap.get(update.view);
		if (!enabled) return;
		if (update.docChanged) {
			const text = update.state.doc.toString();
			const decorations = computeDecorations(text, plugin.settings);
			update.view.dispatch({ effects: sentenceHighlightEffect.of(decorations) });
		}
	});
}

export default class SentenceHighlighterPlugin extends Plugin {
	settings: SentenceHighlighterSettings;
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
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				this.updateStatusBar(statusBarItem);
				if (activeView) {
					const cm: EditorView = (activeView.editor as any).cm;
					const enabled = this.editorHighlightingMap.get(cm) || false;
					if (enabled) {
						this.refreshHighlighting(activeView.editor);
					} else {
						// Ensure that if highlighting is disabled, we clear any decorations.
						cm.dispatch({ effects: sentenceHighlightEffect.of(RangeSet.empty) });
					}
				}
			})
		);		

		// Initialize the active editor's highlighting state to the default.
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const cm: EditorView = (activeView.editor as any).cm;
			this.editorHighlightingMap.set(cm, this.settings.defaultHighlightingEnabled);
			if (this.settings.defaultHighlightingEnabled) {
				this.refreshHighlighting(activeView.editor);
			}
		}
	}

	private updateStatusBar(statusBarItem: HTMLElement) {
		statusBarItem.empty();
		setIcon(statusBarItem, "highlighter");
		// Determine the state for the active editor.
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let enabled = false;
		if (activeView) {
			const cm: EditorView = (activeView.editor as any).cm;
			enabled = this.editorHighlightingMap.get(cm) || false;
		}
		statusBarItem.createSpan({
			text: enabled ? " Highlighting On" : " Highlighting Off",
		});
		statusBarItem.title = "Click to toggle sentence highlighting for this editor";
		statusBarItem.toggleClass("is-active", enabled);
	}

	/**
	 * Toggles highlighting only for the active editor.
	 */
	private async toggleHighlighting(statusBarItem: HTMLElement) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		const editor = activeView.editor;
		const cm: EditorView = (editor as any).cm;
		const current = this.editorHighlightingMap.get(cm) || false;
		const newState = !current;
		this.editorHighlightingMap.set(cm, newState);
		this.updateStatusBar(statusBarItem);

		if (newState) {
			this.refreshHighlighting(editor);
		} else {
			cm.dispatch({ effects: sentenceHighlightEffect.of(RangeSet.empty) });
		}
	}

	/**
	 * Recomputes and dispatches the updated decorations for the given editor.
	 */
	private refreshHighlighting(editor: Editor) {
		const cm: EditorView = (editor as any).cm;
		if (!cm) return;
		const text = editor.getValue();
		const decorations = computeDecorations(text, this.settings);
		cm.dispatch({ effects: sentenceHighlightEffect.of(decorations) });
	}

	onunload() {
		// Optionally, clear decorations from the active editor on unload.
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const cm: EditorView = (activeView.editor as any).cm;
			if (cm) {
				cm.dispatch({ effects: sentenceHighlightEffect.of(RangeSet.empty) });
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.registerStyles(); // Update styles if settings changed.
	}

	private registerStyles() {
		const existingStyle = document.getElementById("sentence-highlighter-styles");
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
 * Computes a RangeSet of decorations based on sentence boundaries.
 */
function computeDecorations(text: string, settings: SentenceHighlighterSettings): RangeSet<Decoration> {
	const builder = new RangeSetBuilder<Decoration>();
	// Use regex.exec to capture sentence boundaries
	const regex = /[^.!?]+[.!?]+/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		const sentence = match[0];
		const start = match.index;
		const end = match.index + sentence.length;
		const wordCount = countWords(sentence);
		const className = getClassForSentence(wordCount, settings);
		if (className) {
			builder.add(start, end, Decoration.mark({ class: className }));
		}
	}
	return builder.finish();
}

function countWords(sentence: string): number {
	return (sentence.match(/\b\w+\b/g) || []).length;
}

function getClassForSentence(wordCount: number, settings: SentenceHighlighterSettings): string {
	if (wordCount <= settings.shortThreshold) {
		return "sh-short";
	} else if (wordCount >= settings.longThreshold) {
		return "sh-long";
	}
	return "sh-medium";
}

class SentenceHighlighterSettingTab extends PluginSettingTab {
	plugin: SentenceHighlighterPlugin;
	constructor(app: App, plugin: SentenceHighlighterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Sentence Highlighter Settings" });
		new Setting(containerEl)
			.setName("Short sentence threshold")
			.setDesc("Number of words or less to be considered a short sentence")
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
