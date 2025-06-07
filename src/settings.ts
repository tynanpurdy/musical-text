/**
 * Settings and configuration for Musical Text plugin
 */

import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import {
	ColorPalette,
	MusicalTextSettings,
	SentenceMarkingStyle,
} from "./types";
import MusicalTextPlugin from "../main";

/** Popular code editor color palettes */
export const COLOR_PALETTES: Record<string, ColorPalette> = {
	default: {
		name: "Default",
		miniSentenceColor: "#AF3029",
		shortSentenceColor: "#BC5215",
		mediumSentenceColor: "#AD8301",
		longSentenceColor: "#66800B",
	},
	github: {
		name: "Github",
		miniSentenceColor: "#F87683",
		shortSentenceColor: "#DCDCAA",
		mediumSentenceColor: "#4EC9B0",
		longSentenceColor: "#4FC1FF",
	},
	oneDarkPro: {
		name: "One Dark Pro",
		miniSentenceColor: "#E06C75",
		shortSentenceColor: "#E5C07B",
		mediumSentenceColor: "#98C379",
		longSentenceColor: "#61AFEE",
	},
	ayu: {
		name: "Ayu",
		miniSentenceColor: "#FF8F40",
		shortSentenceColor: "#FFB454",
		mediumSentenceColor: "#ABD94B",
		longSentenceColor: "#D2A6FF",
	},
	ayuLight: {
		name: "Ayu Light",
		miniSentenceColor: "#FA8D3F",
		shortSentenceColor: "#F2AE49",
		mediumSentenceColor: "#85B300",
		longSentenceColor: "#A37ACC",
	},
	monokaiDark: {
		name: "Monokai Dark",
		miniSentenceColor: "#FF6188",
		shortSentenceColor: "#FFD966",
		mediumSentenceColor: "#A8DC76",
		longSentenceColor: "#78DCE8",
	},
	monokaiLight: {
		name: "Monokai Light",
		miniSentenceColor: "#E14774",
		shortSentenceColor: "#CC7A0A",
		mediumSentenceColor: "#269D69",
		longSentenceColor: "#1C8CA8",
	},
	tokyoNight: {
		name: "Tokyo Night",
		miniSentenceColor: "#FF9D65",
		shortSentenceColor: "#9ECE6A",
		mediumSentenceColor: "#7AA2F7",
		longSentenceColor: "#BB9AF7",
	},
	tokyoNightLight: {
		name: "Tokyo Night Light",
		miniSentenceColor: "#965027",
		shortSentenceColor: "#385F0C",
		mediumSentenceColor: "#2859A9",
		longSentenceColor: "#66359E",
	},
	dracula: {
		name: "Dracula",
		miniSentenceColor: "#FF79C6",
		shortSentenceColor: "#E9F284",
		mediumSentenceColor: "#4FFA7B",
		longSentenceColor: "#BC93F9",
	},
	nord: {
		name: "Nord",
		miniSentenceColor: "#A3BE8C",
		shortSentenceColor: "#88C1D0",
		mediumSentenceColor: "#81A1C1",
		longSentenceColor: "#B48EAD",
	},
	catppuccinFrappe: {
		name: "Catppuccin Frappé",
		miniSentenceColor: "#EF9E76",
		shortSentenceColor: "#A6D189",
		mediumSentenceColor: "#8CAAEE",
		longSentenceColor: "#CA9EE6",
	},
	catppuccinMacchiato: {
		name: "Catppuccin Macchiato",
		miniSentenceColor: "#F5A97F",
		shortSentenceColor: "#A6DA95",
		mediumSentenceColor: "#8AADF4",
		longSentenceColor: "#C6A0F6",
	},
	catppuccinLatte: {
		name: "Catppuccin Latte",
		miniSentenceColor: "#FE640C",
		shortSentenceColor: "#40A02B",
		mediumSentenceColor: "#1F65F5",
		longSentenceColor: "#8839EF",
	},
	catppuccinMocha: {
		name: "Catppuccin Mocha",
		miniSentenceColor: "#FAB387",
		shortSentenceColor: "#A6E3A1",
		mediumSentenceColor: "#89B4FA",
		longSentenceColor: "#CBA6F7",
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
	shortThreshold: 4, // words
	mediumThreshold: 7, // words
	longThreshold: 12, // words
	defaultHighlightingEnabled: false,
};

/** Settings tab for configuring colors and thresholds */
export class SentenceHighlighterSettingTab extends PluginSettingTab {
	plugin: MusicalTextPlugin;

	constructor(app: App, plugin: MusicalTextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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
					"Text color",
				);
				dropdown.addOption(
					SentenceMarkingStyle.COLOR_UNDERLINING,
					"Color underlining",
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
			.setDesc("Color for very short sentences")
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
			.setDesc("Color for short sentences")
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
			.setDesc("Color for medium sentences")
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
			.setDesc("Color for long sentences")
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
				`Medium sentence word count (current: ${this.plugin.settings.mediumThreshold})`,
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
			.setDesc("Long sentence word count")
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

				const validateAndSave = async () => {
					const value = textComponent.getValue();
					if (value === "") {
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
							`Long threshold must be greater than ${this.plugin.settings.mediumThreshold}`,
						);
						this.display();
						return;
					}
					this.plugin.settings.longThreshold = numValue;
					await this.plugin.saveSettings();
					this.display();
				};

				textComponent.inputEl.addEventListener("blur", validateAndSave);
				textComponent.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") validateAndSave();
				});

				return textComponent;
			});
	}

	private validateThresholds(): void {
		const { settings } = this.plugin;

		if (settings.mediumThreshold <= settings.shortThreshold) {
			settings.mediumThreshold = Math.max(2, settings.shortThreshold + 1);
		}

		if (settings.longThreshold <= settings.mediumThreshold) {
			settings.longThreshold = Math.max(3, settings.mediumThreshold + 1);
		}

		if (settings.shortThreshold >= settings.mediumThreshold) {
			settings.shortThreshold = Math.max(1, settings.mediumThreshold - 1);
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
