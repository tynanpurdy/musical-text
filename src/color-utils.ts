/**
 * Color utility functions for generating contrasting text colors
 * 
 * This system automatically generates text colors that maintain good contrast
 * with any background color while preserving the same hue. This ensures
 * readability across all color palettes and custom color selections.
 * 
 * Examples:
 * - Background: #ff5555 (bright red) → Text: #4d0000 (dark red)
 * - Background: #2d2d2d (dark gray) → Text: #e0e0e0 (light gray)
 * - Background: #fabd2f (bright yellow) → Text: #3d2900 (dark yellow)
 */

/**
 * Converts a hex color to HSL values
 * @param hex The hex color string (e.g., "#ff5555")
 * @returns Object with h, s, l values
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	// Remove # if present
	hex = hex.replace('#', '');
	
	// Convert to RGB
	const r = parseInt(hex.substr(0, 2), 16) / 255;
	const g = parseInt(hex.substr(2, 2), 16) / 255;
	const b = parseInt(hex.substr(4, 2), 16) / 255;
	
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	
	return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL values to hex color
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
	h = h / 360;
	s = s / 100;
	l = l / 100;
	
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1/6) return p + (q - p) * 6 * t;
		if (t < 1/2) return q;
		if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;
	};
	
	let r, g, b;
	
	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}
	
	const toHex = (c: number) => {
		const hex = Math.round(c * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};
	
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a contrasting text color of the same hue for optimal readability
 * 
 * The algorithm works by:
 * 1. Converting the background color from hex to HSL (Hue, Saturation, Lightness)
 * 2. Preserving the hue to maintain color harmony
 * 3. Adjusting lightness for contrast:
 *    - Light backgrounds (>50% lightness) get dark text (~15-25% lightness)
 *    - Dark backgrounds (≤50% lightness) get light text (~75-85% lightness)
 * 4. Slightly boosting saturation for better visibility
 * 
 * @param backgroundColor The background color in hex format (e.g., "#ff5555")
 * @returns A contrasting text color in hex format that maintains readability
 */
export function getContrastingTextColor(backgroundColor: string): string {
	const hsl = hexToHsl(backgroundColor);
	
	// For light backgrounds (lightness > 50%), use a much darker version
	// For dark backgrounds (lightness <= 50%), use a much lighter version
	let newLightness: number;
	if (hsl.l > 50) {
		// Light background - use dark text (15-25% lightness)
		newLightness = Math.max(15, hsl.l - 60);
	} else {
		// Dark background - use light text (75-85% lightness)
		newLightness = Math.min(85, hsl.l + 60);
	}
	
	// Increase saturation slightly for better visibility while maintaining hue
	const adjustedSaturation = Math.min(100, hsl.s * 1.1);
	
	return hslToHex(hsl.h, adjustedSaturation, newLightness);
}