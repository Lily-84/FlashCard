// types.js

/**
 * @typedef {Object} Card
 * @property {string} id - Unique identifier for the card
 * @property {string} word - The word in source language
 * @property {string} meaning - The meaning in target language
 * @property {string} [example] - Example sentence in source language (optional)
 * @property {string} [exampleTranslation] - Translated example sentence (optional)
 * @property {string} [note] - Additional note (optional)
 * @property {number} [createdAt] - Timestamp when card was created (optional)
 * @property {number} [lastReviewed] - Timestamp of last review (optional)
 * @property {number} [reviewCount] - Number of times reviewed (optional)
 */

/**
 * @typedef {Object} FlashcardSet
 * @property {string} id - Unique identifier for the set
 * @property {string} name - Name of the set
 * @property {string} sourceLang - Source language (e.g., 'english')
 * @property {string} targetLang - Target language (e.g., 'vietnamese')
 * @property {Array<Card>} cards - Array of cards in the set
 * @property {number} [createdAt] - Timestamp when set was created (optional)
 * @property {number} [updatedAt] - Timestamp when set was last updated (optional)
 */