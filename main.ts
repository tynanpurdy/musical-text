import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Editor,
	MarkdownView,
	setIcon,
} from "obsidian";

interface SentenceHighlighterSettings {
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
	shortThreshold: number;
	longThreshold: number;
	isHighlightingEnabled: boolean;
}

const DEFAULT_SETTINGS: SentenceHighlighterSettings = {
	shortSentenceColor: "#e3f2fd", // light blue
	mediumSentenceColor: "#fff3e0", // light orange
	longSentenceColor: "#ffebee", // light red
	shortThreshold: 10, // words
	longThreshold: 25, // words
	isHighlightingEnabled: false,
};

export default class SentenceHighlighterPlugin extends Plugin {
	settings: SentenceHighlighterSettings;
	private decorations: any[] = [];
	private statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();

		// Add click handler to status bar
		this.statusBarItem.addClass("sentence-highlighter-status");
		this.statusBarItem.addEventListener("click", () => {
			this.toggleHighlighting();
		});

		// Register the event handler for editor changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.settings.isHighlightingEnabled) {
					const activeView =
						this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						this.highlightSentences(activeView.editor);
					}
				}
			})
		);

		// Add commands
		this.addCommand({
			id: "toggle-sentence-highlighting",
			name: "Toggle Sentence Highlighting",
			callback: () => {
				this.toggleHighlighting();
			},
		});

		// Register CSS
		this.registerStyles();

		// Add settings tab
		this.addSettingTab(new SentenceHighlighterSettingTab(this.app, this));

		// If highlighting is enabled, apply it to the active editor
		if (this.settings.isHighlightingEnabled) {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.highlightSentences(activeView.editor);
			}
		}
	}

	private updateStatusBar() {
		this.statusBarItem.empty();
		setIcon(this.statusBarItem, "highlighter");

		const status = this.statusBarItem.createSpan({
			text: this.settings.isHighlightingEnabled
				? " Highlighting On"
				: " Highlighting Off",
		});

		this.statusBarItem.title = "Click to toggle sentence highlighting";
		this.statusBarItem.toggleClass(
			"is-active",
			this.settings.isHighlightingEnabled
		);
	}

	private async toggleHighlighting() {
		this.settings.isHighlightingEnabled =
			!this.settings.isHighlightingEnabled;
		await this.saveSettings();

		if (this.settings.isHighlightingEnabled) {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.highlightSentences(activeView.editor);
			}
		} else {
			this.clearDecorations();
		}
	}

	onunload() {
		this.clearDecorations();
		const style = document.getElementById("sentence-highlighter-styles");
		if (style) style.remove();
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
		this.registerStyles();
		this.updateStatusBar();

		if (this.settings.isHighlightingEnabled) {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.highlightSentences(activeView.editor);
			}
		}
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

            div.sentence-highlighter-short {
                background-color: ${this.settings.shortSentenceColor};
                border-radius: 3px;
                padding: 0 2px;
            }
            
            div.sentence-highlighter-medium {
                background-color: ${this.settings.mediumSentenceColor};
                border-radius: 3px;
                padding: 0 2px;
            }
            
            div.sentence-highlighter-long {
                background-color: ${this.settings.longSentenceColor};
                border-radius: 3px;
                padding: 0 2px;
            }
        `;
		document.head.appendChild(style);
	}

	private clearDecorations() {
		this.decorations.forEach((decoration) => {
			if (decoration) {
				decoration.clear();
			}
		});
		this.decorations = [];
	}

	private highlightSentences(editor: Editor) {
		console.log("Starting sentence highlighting");
		this.clearDecorations();

		const text = editor.getValue();
		const sentences = this.splitIntoSentences(text);

		let currentPosition = 0;
		sentences.forEach((sentence) => {
			if (sentence.trim()) {
				const wordCount = this.countWords(sentence);
				const className = this.getClassForSentence(wordCount);

				try {
					const from = editor.offsetToPos(currentPosition);
					const to = editor.offsetToPos(
						currentPosition + sentence.length
					);

					console.log(
						`Highlighting sentence: "${sentence.trim()}" with class: ${className}`
					);

					// Using Obsidian's editor.addDecoration() API
					const decoration = editor.addDecoration(
						{ from: from, to: to },
						className
					);

					this.decorations.push(decoration);
				} catch (e) {
					console.error("Error highlighting sentence:", e);
				}
			}
			currentPosition += sentence.length;
		});

		console.log(`Highlighted ${sentences.length} sentences`);
	}

	private splitIntoSentences(text: string): string[] {
		const abbreviations =
			/Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|etc\.|i\.e\.|e\.g\./gi;
		const text_with_placeholders = text.replace(abbreviations, (match) =>
			match.replace(".", "@")
		);
		const sentences = text_with_placeholders.match(/[^.!?]+[.!?]+/g) || [];
		return sentences.map((sentence) => sentence.replace(/@/g, "."));
	}

	private countWords(sentence: string): number {
		return sentence
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0).length;
	}

	private getClassForSentence(wordCount: number): string {
		if (wordCount <= this.settings.shortThreshold) {
			return "sentence-highlighter-short";
		} else if (wordCount >= this.settings.longThreshold) {
			return "sentence-highlighter-long";
		}
		return "sentence-highlighter-medium";
	}
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
