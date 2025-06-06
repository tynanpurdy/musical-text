/**
 * Type definitions for the Musical Text plugin
 */

/**
 * Enum for different sentence marking styles
 */
export enum SentenceMarkingStyle {
	HIGHLIGHTING = "highlighting",
	TEXT_COLOR = "textColor",
	COLOR_UNDERLINING = "colorUnderlining",
}

/**
 * Settings interface for the Musical Text plugin.
 * Defines color schemes and thresholds for sentence highlighting.
 */
export interface MusicalTextSettings {
	colorPalette: string;
	markingStyle: SentenceMarkingStyle;
	miniSentenceColor: string;
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
	shortThreshold: number;
	mediumThreshold: number;
	longThreshold: number;
	defaultHighlightingEnabled: boolean;
}

/**
 * Interface for color palette definitions
 */
export interface ColorPalette {
	name: string;
	miniSentenceColor: string;
	shortSentenceColor: string;
	mediumSentenceColor: string;
	longSentenceColor: string;
}

/**
 * Result of markdown list marker detection
 */
export interface MarkdownListMarkerResult {
	content: string;
	markerLength: number;
}