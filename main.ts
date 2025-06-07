/**
 * Musical Text Plugin for Obsidian
 * Provides sentence highlighting with customizable colors and styles.
 */

import { Plugin, Editor, MarkdownView, setIcon } from "obsidian";
import { EditorView, Decoration } from "@codemirror/view";
import {
	StateField,
	StateEffect,
	RangeSet,
	RangeSetBuilder,
} from "@codemirror/state";

// Import modular components
import { MusicalTextSettings, SentenceMarkingStyle } from "./src/types";
import { getContrastingTextColor } from "./src/color-utils";
import { computeDecorations } from "./src/sentence-detection";
import {
	DEFAULT_SETTINGS,
	SentenceHighlighterSettingTab,
} from "./src/settings";

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

	/** Gets CodeMirror EditorView from Editor or active view */
	private getEditorView(editor?: Editor): EditorView | null {
		const targetEditor =
			editor ||
			this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		return targetEditor ? (targetEditor as any).cm : null;
	}

	/** Applies or clears highlighting for the given editor */
	private applyHighlightingToEditor(editor: Editor, enabled: boolean): void {
		const cm = this.getEditorView(editor);
		if (!cm) return;

		if (enabled) {
			this.refreshHighlighting(editor);
		} else {
			cm.dispatch({
				effects: sentenceHighlightEffect.of(RangeSet.empty),
			});
		}
	}

	/** Toggles highlighting for the active editor */
	private async toggleHighlighting(statusBarItem: HTMLElement) {
		const editor =
			this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor) return;

		const cm = this.getEditorView(editor);
		if (!cm) return;

		const currentState = this.editorHighlightingMap.get(cm) || false;
		const newState = !currentState;

		this.editorHighlightingMap.set(cm, newState);
		this.updateStatusBar(statusBarItem);
		this.applyHighlightingToEditor(editor, newState);
	}

	/** Recomputes decorations for visible ranges */
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

	/** Refreshes highlighting in all editors with highlighting enabled */
	private refreshAllActiveHighlighting() {
		this.registerStyles();
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

		// Generate styles based on marking style preference
		const generateSentenceStyles = () => {
			const baseStyles = `
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
			`;

			switch (this.settings.markingStyle) {
				case SentenceMarkingStyle.HIGHLIGHTING: {
					// Generate contrasting text colors for background highlighting
					const miniTextColor = getContrastingTextColor(
						this.settings.miniSentenceColor,
					);
					const shortTextColor = getContrastingTextColor(
						this.settings.shortSentenceColor,
					);
					const mediumTextColor = getContrastingTextColor(
						this.settings.mediumSentenceColor,
					);
					const longTextColor = getContrastingTextColor(
						this.settings.longSentenceColor,
					);

					return (
						baseStyles +
						`
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
					`
					);
				}

				case SentenceMarkingStyle.TEXT_COLOR: {
					return (
						baseStyles +
						`
						.sh-mini { color: ${this.settings.miniSentenceColor}; }
						.sh-short { color: ${this.settings.shortSentenceColor}; }
						.sh-medium { color: ${this.settings.mediumSentenceColor}; }
						.sh-long { color: ${this.settings.longSentenceColor}; }
					`
					);
				}

				case SentenceMarkingStyle.COLOR_UNDERLINING: {
					return (
						baseStyles +
						`
						.sh-mini {
							text-decoration: underline;
							text-decoration-color: ${this.settings.miniSentenceColor};
							text-decoration-thickness: 2px;
							text-underline-offset: 2px;
						}
						.sh-short {
							text-decoration: underline;
							text-decoration-color: ${this.settings.shortSentenceColor};
							text-decoration-thickness: 2px;
							text-underline-offset: 2px;
						}
						.sh-medium {
							text-decoration: underline;
							text-decoration-color: ${this.settings.mediumSentenceColor};
							text-decoration-thickness: 2px;
							text-underline-offset: 2px;
						}
						.sh-long {
							text-decoration: underline;
							text-decoration-color: ${this.settings.longSentenceColor};
							text-decoration-thickness: 2px;
							text-underline-offset: 2px;
						}
					`
					);
				}

				default:
					return baseStyles;
			}
		};

		style.textContent = generateSentenceStyles();
		document.head.appendChild(style);
	}
}
