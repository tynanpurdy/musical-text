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
		if (/^\r?\n$/.test(line) || line.trim().length === 0) {
			currentOffset += line.length;
			continue;
		}
		
		const listMarkerMatch = detectMarkdownListMarker(line.trim());
		
		if (listMarkerMatch) {
			const actualContent = listMarkerMatch.content;
			if (actualContent.length > 0) {
				const wordCount = countWords(actualContent);
				const className = getClassForSentence(wordCount, settings);
				
				if (className && wordCount > 0) {
					const lineStart = currentOffset + offset;
					const leadingWhitespace = line.length - line.trimStart().length;
					const contentStart = lineStart + leadingWhitespace + listMarkerMatch.markerLength;
					const contentEnd = contentStart + actualContent.length;
					
					if (contentStart < contentEnd) {
						builder.add(contentStart, contentEnd, Decoration.mark({ class: className }));
					}
				}
			}
		} else {
			const sentenceRegex = /([^.!?]*[.!?]+\s*|[^.!?\r\n]+(?=\r?\n|$))/g;
			let match: RegExpExecArray | null;
			
			while ((match = sentenceRegex.exec(line)) !== null) {
				const sentence = match[0];
				const trimmedSentence = sentence.trim();
				
				if (trimmedSentence.length === 0) continue;
				
				const wordCount = countWords(trimmedSentence);
				const className = getClassForSentence(wordCount, settings);
				
				if (className && wordCount > 0) {
					const sentenceStart = currentOffset + match.index + offset;
					const leadingWhitespace = sentence.length - sentence.trimStart().length;
					const trailingWhitespace = sentence.length - sentence.trimEnd().length;
					const contentStart = sentenceStart + leadingWhitespace;
					const contentEnd = sentenceStart + sentence.length - trailingWhitespace;
					
					if (contentStart < contentEnd) {
						builder.add(contentStart, contentEnd, Decoration.mark({ class: className }));
					}
				}
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
			content: checkboxMatch[2].trim(), 
			markerLength: checkboxMatch[1].length 
		};
	}
	
	// Ordered lists
	const orderedMatch = line.match(/^(\s*)(\d+)(\.)(\s+)(.*)$/);
	if (orderedMatch) {
		const markerLength = orderedMatch[1].length + orderedMatch[2].length + 
			orderedMatch[3].length + orderedMatch[4].length;
		return { 
			content: orderedMatch[5].trim(), 
			markerLength: markerLength 
		};
	}
	
	// Unordered lists
	const unorderedMatch = line.match(/^(\s*[-*+]\s+)(.*)$/);
	if (unorderedMatch) {
		return { 
			content: unorderedMatch[2].trim(), 
			markerLength: unorderedMatch[1].length 
		};
	}
	
	return null;
}

/** Counts words in a sentence using word boundary matching */
export function countWords(sentence: string): number {
	return (sentence.match(/\b\w+\b/g) || []).length;
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