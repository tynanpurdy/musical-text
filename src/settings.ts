/**
 * Settings and configuration for the Musical Text plugin
 */

import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import {
	ColorPalette,
	MusicalTextSettings,
	SentenceMarkingStyle,
} from "./types";
import MusicalTextPlugin from "../main";

/**
 * Color palettes from popular code editors
 */
export const COLOR_PALETTES: Record<string, ColorPalette> = {
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
export const DEFAULT_SETTINGS: MusicalTextSettings = {
	colorPalette: "default",
	markingStyle: SentenceMarkingStyle.HIGHLIGHTING,
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
 * Settings tab implementation for the Musical Text plugin.
 * Provides UI for configuring sentence thresholds and highlight colors.
 */
export class SentenceHighlighterSettingTab extends PluginSettingTab {
	plugin: MusicalTextPlugin;

	constructor(app: App, plugin: MusicalTextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Ensure thresholds are valid before displaying
		this.validateThresholds();

		new Setting(containerEl)
			.setName("Sentence marking style")
			.setDesc("Choose how sentences are visually marked")
			.addDropdown((dropdown) => {
				dropdown.addOption(
					SentenceMarkingStyle.HIGHLIGHTING,
					"Highlighting",
				);
				dropdown.addOption(
					SentenceMarkingStyle.TEXT_COLOR,
					"Text Color",
				);
				dropdown.addOption(
					SentenceMarkingStyle.COLOR_UNDERLINING,
					"Color Underlining",
				);
				dropdown
					.setValue(this.plugin.settings.markingStyle)
					.onChange(async (value) => {
						this.plugin.settings.markingStyle =
							value as SentenceMarkingStyle;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName("Color Palette")
			.setDesc("Choose from popular code editor color schemes")
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
		new Setting(containerEl).setName("Colors").setHeading();
		new Setting(containerEl)
			.setName("Mini sentence color")
			.setDesc(
				"Color for sentences below the short threshold (background, text, or underline depending on marking style)",
			)
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
			.setDesc(
				"Color for short sentences (background, text, or underline depending on marking style)",
			)
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
			.setDesc(
				"Color for medium sentences (background, text, or underline depending on marking style)",
			)
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
			.setDesc(
				"Color for long sentences (background, text, or underline depending on marking style)",
			)
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
		new Setting(containerEl)
			.setName("Sentence length thresholds")
			.setHeading();
		new Setting(containerEl)
			.setName("Short sentence threshold")
			.setDesc(
				`Number of words or less to be considered a short sentence (current: ${this.plugin.settings.shortThreshold} words)`,
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
			.addSlider((slider) =>
				slider
					.setLimits(
						1,
						Math.max(1, this.plugin.settings.mediumThreshold - 1),
						1,
					)
					.setValue(this.plugin.settings.shortThreshold)
					.onChange(async (value) => {
						this.plugin.settings.shortThreshold = value;
						this.validateThresholds();
						await this.plugin.saveSettings();
						this.display();
					})
					.setDynamicTooltip(),
			);
		new Setting(containerEl)
			.setName("Medium sentence threshold")
			.setDesc(
				`Number of words between short and long thresholds to be considered a medium sentence (current: ${this.plugin.settings.mediumThreshold} words)`,
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
			.addSlider((slider) =>
				slider
					.setLimits(
						Math.max(2, this.plugin.settings.shortThreshold + 1),
						Math.max(
							this.plugin.settings.shortThreshold + 2,
							this.plugin.settings.longThreshold - 1,
						),
						1,
					)
					.setValue(this.plugin.settings.mediumThreshold)
					.onChange(async (value) => {
						this.plugin.settings.mediumThreshold = value;
						this.validateThresholds();
						await this.plugin.saveSettings();
						this.display();
					})
					.setDynamicTooltip(),
			);
		new Setting(containerEl)
			.setName("Long sentence threshold")
			.setDesc(`Number of words or more to be considered a long sentence`)
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
			.addText((text) => {
				const textComponent = text
					.setPlaceholder(DEFAULT_SETTINGS.longThreshold.toString())
					.setValue(this.plugin.settings.longThreshold.toString());

				// Validation function to avoid duplication
				const validateAndSave = async () => {
					const value = textComponent.getValue();
					if (value == "") {
						this.plugin.settings.longThreshold =
							DEFAULT_SETTINGS.longThreshold;
						await this.plugin.saveSettings();
						this.display();
						return;
					}
					const numValue = parseInt(value);
					if (
						isNaN(numValue) ||
						numValue <= this.plugin.settings.mediumThreshold
					) {
						new Notice(
							`Long threshold must be greater than medium threshold (${this.plugin.settings.mediumThreshold}). Reverting to previous value.`,
						);
						this.display(); // Revert to previous value by refreshing
						return;
					}
					this.plugin.settings.longThreshold = numValue;
					await this.plugin.saveSettings();
					this.display();
				};

				// Use blur event instead of change to allow complete typing
				textComponent.inputEl.addEventListener("blur", validateAndSave);

				// Also validate on Enter key
				textComponent.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						validateAndSave();
					}
				});

				return textComponent;
			});
	}

	private validateThresholds(): void {
		// Ensure thresholds are in correct order: short < medium < long
		// Also ensure minimum viable ranges for sliders

		// Ensure medium is at least short + 1 (minimum 2)
		if (
			this.plugin.settings.mediumThreshold <=
			this.plugin.settings.shortThreshold
		) {
			this.plugin.settings.mediumThreshold = Math.max(
				2,
				this.plugin.settings.shortThreshold + 1,
			);
		}

		// Ensure long is at least medium + 1 (minimum 3)
		if (
			this.plugin.settings.longThreshold <=
			this.plugin.settings.mediumThreshold
		) {
			this.plugin.settings.longThreshold = Math.max(
				3,
				this.plugin.settings.mediumThreshold + 1,
			);
		}

		// Ensure short is at least 1 but less than medium
		if (
			this.plugin.settings.shortThreshold >=
			this.plugin.settings.mediumThreshold
		) {
			this.plugin.settings.shortThreshold = Math.max(
				1,
				this.plugin.settings.mediumThreshold - 1,
			);
		}
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
