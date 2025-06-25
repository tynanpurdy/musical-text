/**
 * Sentence detection and markdown parsing for Musical Text highlighting
 */

import winkNLP from 'wink-nlp';
import { ItemSentence } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

import { RangeSet, RangeSetBuilder } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { MusicalTextSettings, MarkdownFilterResult } from "./types";

const nlp = winkNLP(model, ["sbd"]);
const its = nlp.its;

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

		const listMarkerMatch = detectMarkdownListMarker(line);
		if (listMarkerMatch) {
			processedLine = listMarkerMatch.content;
			processedLineOffset += listMarkerMatch.markerLength;
		}

		if (!processedLine || processedLine.length === 0) {
			currentOffset += line.length;
			continue;
		}

		const doc = nlp.readDoc(processedLine);
		doc.sentences().each((x: ItemSentence) => {
			const rawSentence: string = x.out();
			if (!rawSentence) return;

			const lineStart = processedLine.indexOf(rawSentence);
			if (lineStart === -1) return;

			const wordCount = x.tokens().filter(e => e.out(its.type) === 'word').length();
			if (wordCount == 0) return;

			const styleClass = getClassForSentence(wordCount, settings);

			const sentenceStart = processedLineOffset + lineStart + offset;
			const sentenceEnd = sentenceStart + rawSentence.trimEnd().length;
			if (sentenceStart >= sentenceEnd) return;

			builder.add(sentenceStart, sentenceEnd, Decoration.mark({ class: styleClass }));
		});

		currentOffset += line.length;
	}

	return builder.finish();
}

/** Detects markdown list markers and extracts content */
export function detectMarkdownListMarker(line: string): MarkdownFilterResult | null {
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

	// Block Quotes
	const blockMatch = line.match(/^(?:>\s*)+(.+)$/);
	if (blockMatch) {
		const markerLength = blockMatch[0].length - blockMatch[1].length;

		return {
			content: blockMatch[1],
			markerLength: markerLength
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
