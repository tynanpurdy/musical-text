/**
 * Sentence detection and markdown parsing utilities for the Musical Text plugin
 */

import { RangeSet, RangeSetBuilder } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { MusicalTextSettings, MarkdownListMarkerResult } from "./types";

/**
 * Analyzes text and creates decorations for sentence highlighting.
 * Uses enhanced regex to identify sentence boundaries including:
 * - Traditional punctuation (periods, exclamations, questions)
 * - Line breaks (text ending at line boundaries)
 * - Paragraph breaks (text ending at paragraph boundaries)
 * - Markdown list items (excluding list markers from highlighting)
 * 
 * Decorations exclude leading and trailing whitespace to prevent
 * highlighting spaces between sentences.
 * 
 * @param text The text content to analyze
 * @param settings Plugin settings containing thresholds and styles
 * @param offset Position offset to adjust decoration positions
 * @returns A RangeSet containing the computed decorations
 */
export function computeDecorations(
	text: string,
	settings: MusicalTextSettings,
	offset = 0,
): RangeSet<Decoration> {
	const builder = new RangeSetBuilder<Decoration>();
	
	// Process text line by line to better handle markdown lists
	const lines = text.split(/(\r?\n)/);
	let currentOffset = 0;
	
	for (const line of lines) {
		// Skip line break characters themselves
		if (/^\r?\n$/.test(line)) {
			currentOffset += line.length;
			continue;
		}
		
		// Skip empty lines
		if (line.trim().length === 0) {
			currentOffset += line.length;
			continue;
		}
		
		// Check if this line is a markdown list
		const listMarkerMatch = detectMarkdownListMarker(line.trim());
		
		if (listMarkerMatch) {
			// This is a markdown list line - highlight only the content
			const actualContent = listMarkerMatch.content;
			
			if (actualContent.length > 0) {
				const wordCount = countWords(actualContent);
				const className = getClassForSentence(wordCount, settings);
				
				if (className && wordCount > 0) {
					const lineStart = currentOffset + offset;
					const leadingWhitespace = line.length - line.trimStart().length;
					const contentStart = lineStart + leadingWhitespace + listMarkerMatch.markerLength;
					const contentLength = actualContent.length;
					const contentEnd = contentStart + contentLength;
					
					// Ensure we don't create invalid ranges
					if (contentStart < contentEnd) {
						builder.add(contentStart, contentEnd, Decoration.mark({ class: className }));
					}
				}
			}
		} else {
			// Not a markdown list - use traditional sentence detection
			const sentenceRegex = /([^.!?]*[.!?]+\s*|[^.!?\r\n]+(?=\r?\n|$))/g;
			let match: RegExpExecArray | null;
			
			while ((match = sentenceRegex.exec(line)) !== null) {
				const sentence = match[0];
				const trimmedSentence = sentence.trim();
				
				if (trimmedSentence.length === 0) {
					continue;
				}
				
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

/**
 * Detects markdown list markers and extracts content
 * @param line The line to process
 * @returns Object with content (without markers) and marker length, or null if no marker found
 */
export function detectMarkdownListMarker(line: string): MarkdownListMarkerResult | null {
	// More explicit regex patterns for different markdown list types (order matters!)
	
	// First, try checkboxes (must come first to avoid conflict with unordered lists)
	const checkboxMatch = line.match(/^(\s*[-*+]\s*\[[xX\s]\]\s*)(.*)$/);
	if (checkboxMatch) {
		return { 
			content: checkboxMatch[2].trim(), 
			markerLength: checkboxMatch[1].length 
		};
	}
	
	// Then try ordered lists - be very explicit about the pattern
	const orderedMatch = line.match(/^(\s*)(\d+)(\.)(\s+)(.*)$/);
	if (orderedMatch) {
		const indentation = orderedMatch[1]; // leading whitespace
		const number = orderedMatch[2]; // the number
		const dot = orderedMatch[3]; // the dot
		const spaces = orderedMatch[4]; // spaces after dot
		const content = orderedMatch[5]; // content
		
		const markerLength = indentation.length + number.length + dot.length + spaces.length;
		return { 
			content: content.trim(), 
			markerLength: markerLength 
		};
	}
	
	// Finally try unordered lists
	const unorderedMatch = line.match(/^(\s*[-*+]\s+)(.*)$/);
	if (unorderedMatch) {
		return { 
			content: unorderedMatch[2].trim(), 
			markerLength: unorderedMatch[1].length 
		};
	}
	
	// No markdown markers found
	return null;
}

/**
 * Counts the number of words in a sentence using word boundary matching.
 * @param sentence The sentence to analyze
 * @returns Number of words found in the sentence
 */
export function countWords(sentence: string): number {
	return (sentence.match(/\b\w+\b/g) || []).length;
}

/**
 * Determines the appropriate CSS class for a sentence based on its word count.
 * @param wordCount Number of words in the sentence
 * @param settings Plugin settings containing thresholds
 * @returns CSS class name for styling the sentence
 */
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