import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import {
	StateField,
	StateEffect,
	EditorState,
	RangeSet,
	RangeSetBuilder,
	Transaction,
} from "@codemirror/state";

// Remember to rename these classes and interfaces!

// interface MyPluginSettings {
// 	mySetting: string;
// }

// const DEFAULT_SETTINGS: MyPluginSettings = {
// 	mySetting: "default",
// };

export default class SentenceHighlighter extends Plugin {
	async onload(): Promise<void> {
		console.log("SentenceHighlighter loaded");
		this.registerEditorExtension([sentenceHighlighter, applyHighlighting]);
	}
}

const sentenceHighlightEffect = StateEffect.define<{
	decorations: RangeSet<Decoration>;
}>();

const sentenceHighlighter = StateField.define<RangeSet<Decoration>>({
	create(): RangeSet<Decoration> {
		return RangeSet.empty;
	},
	update(decorations, transaction: Transaction): RangeSet<Decoration> {
		let effects = transaction.effects.filter((effect) =>
			effect.is(sentenceHighlightEffect)
		);
		if (effects.length > 0) {
			return effects[0].value || RangeSet.empty;
		}
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field),
});

const applyHighlighting = EditorView.updateListener.of((update) => {
	if (update.docChanged) {
		const text = update.state.doc.toString();
		const decorations = highlightSentences(text);
		update.view.dispatch({
			effects: sentenceHighlightEffect.of(decorations),
		});
	}
});

function highlightSentences(text: string): RangeSet<Decoration> {
	const builder = new RangeSetBuilder<Decoration>();
	const sentences = splitIntoSentences(text);

	let index = 0;
	for (const sentence of sentences) {
		const wordCount = countWords(sentence);
		const color = getColorForWordCount(wordCount);

		if (color) {
			builder.add(
				index,
				index + sentence.length,
				Decoration.mark({ style: `background-color: ${color}` })
			);
		}
		index += sentence.length + 1;
	}
	return builder.finish();
}

function splitIntoSentences(text: string): string[] {
	return text.match(/[^.!?]+[.!?]*/g) || [];
}

function countWords(sentence: string): number {
	return (sentence.match(/\b\w+\b/g) || []).length;
}

function getColorForWordCount(count: number): string | null {
	if (count <= 5) return "#FF5582A6";
	if (count <= 10) return "#FFF3A3A6";
	if (count <= 15) return "#BBFABBA6";
	if (count <= 20) return "#FFB8EBA6";
	if (count > 20) return "#ADCCFFA6";
	return null;
}

// export default class MyPlugin extends Plugin {
// 	settings: MyPluginSettings;

// 	async onload() {
// 		await this.loadSettings();

// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is a notice!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');

// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');

// 		// This adds a simple command that can be triggered anywhere
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}

// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});

// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		this.addSettingTab(new SampleSettingTab(this.app, this));

// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});

// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}

// 	onunload() {

// 	}

// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}

// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText("Woah!");
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName("Setting #1")
// 			.setDesc("It's a secret")
// 			.addText((text) =>
// 				text
// 					.setPlaceholder("Enter your secret")
// 					.setValue(this.plugin.settings.mySetting)
// 					.onChange(async (value) => {
// 						this.plugin.settings.mySetting = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);
// 	}
// }
