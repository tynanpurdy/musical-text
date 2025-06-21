/**
 * Sentence detection and markdown parsing for Musical Text highlighting
 */

import { RangeSet, RangeSetBuilder } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { MusicalTextSettings, MarkdownListMarkerResult } from "./types";

/**
 * Creates sentence highlighting decorations for text.
 * Handles markdown lists and traditional sentence boundaries.
 */
export function computeDecorations(
	text: string,
	settings: MusicalTextSettings,
	offset = 0,
): RangeSet<Decoration> {
	const builder = new RangeSetBuilder<Decoration>();

	const lines = text.split(/(\r?\n)/);
	let currentOffset = 0;

	for (const line of lines) {
		if (line.trim().length === 0) {
			currentOffset += line.length;
			continue;
		}

		let processedLine = line;
		let processedLineOffset = currentOffset;

		const listMarkerMatch = detectMarkdownListMarker(line.trim());
		if (listMarkerMatch) {
			processedLine = listMarkerMatch.content;
			processedLineOffset += listMarkerMatch.markerLength;
		}

		if (processedLine.length === 0) continue;

		const sentenceRegex = /([^.!?]*[.!?]+\s*|[^.!?\r\n]+(?=\r?\n|$))/g;
		let match: RegExpExecArray | null;

		while ((match = sentenceRegex.exec(processedLine)) !== null) {
			const sentence = match[0];
			const trimmedSentence = sentence.trim();

			if (trimmedSentence.length === 0) continue;

			const wordCount = countWords(trimmedSentence);
			const className = getClassForSentence(wordCount, settings);

			if (wordCount === 0) continue;

			const sentenceStart = processedLineOffset + match.index + offset;
			const leadingWhitespace = sentence.length - sentence.trimStart().length;
			const contentStart = sentenceStart + leadingWhitespace;
			const contentEnd = contentStart + trimmedSentence.length;

			if (contentStart < contentEnd) {
				builder.add(contentStart, contentEnd, Decoration.mark({ class: className }));
			}
		}

		currentOffset += line.length;
	}

	return builder.finish();
}

/** Detects markdown list markers and extracts content */
export function detectMarkdownListMarker(line: string): MarkdownListMarkerResult | null {
	// Checkboxes (must be first to avoid conflict with unordered lists)
	const checkboxMatch = line.match(/^(\s*[-*+]\s*\[[xX\s]\]\s*)(.*)$/);
	if (checkboxMatch) {
		return {
			content: checkboxMatch[2],
			markerLength: checkboxMatch[1].length
		};
	}

	// Ordered lists
	const orderedMatch = line.match(/^(\s*)(\d+)(\.)(\s+)(.*)$/);
	if (orderedMatch) {
		const markerLength = orderedMatch[1].length + orderedMatch[2].length +
			orderedMatch[3].length + orderedMatch[4].length;
		return {
			content: orderedMatch[5],
			markerLength: markerLength
		};
	}

	// Unordered lists
	const unorderedMatch = line.match(/^(\s*[-*+]\s+)(.*)$/);
	if (unorderedMatch) {
		return {
			content: unorderedMatch[2],
			markerLength: unorderedMatch[1].length
		};
	}

	return null;
}

/** Counts words in a sentence using word boundary matching */
export function countWords(sentence: string): number {
	return (sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || []).length;
}

/** Returns CSS class for sentence based on word count and thresholds */
export function getClassForSentence(
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
