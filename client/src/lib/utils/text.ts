/**
 * Count words in a string or HTML content
 * @param text The text or HTML content to count words in
 * @returns The number of words
 */
export function countWords(text: string): number {
  if (!text) return 0;
  
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, ' ');
  
  // Remove extra whitespace
  const trimmedText = plainText.replace(/\s+/g, ' ').trim();
  
  // Count words
  const words = trimmedText.split(/\s+/);
  
  // Filter empty strings
  return words.filter(word => word.length > 0).length;
}

/**
 * Truncate text to a specified length and add ellipsis
 * @param text The text to truncate
 * @param maxLength The maximum length
 * @returns The truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Extract plain text from HTML
 * @param html HTML content
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Calculate reading time in minutes
 * @param text The text to calculate reading time for
 * @param wordsPerMinute Average reading speed in words per minute
 * @returns Reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute = 200): number {
  const wordCount = countWords(text);
  const minutes = wordCount / wordsPerMinute;
  return Math.ceil(minutes);
}
