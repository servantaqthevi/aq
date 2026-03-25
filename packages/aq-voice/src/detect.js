// @aq/voice — Communication style detection
'use strict';

/**
 * Detect communication style traits from text.
 *
 * @param {string} text - The text to analyze
 * @returns {Object} { formal, verbose, emotional } — each 0 to 1
 */
function detect(text) {
  if (!text) return { formal: 0.5, verbose: 0.5, emotional: 0.3 };

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const len = words.length;

  // Formal detection
  let formal = 0.5;
  const formalWords = /\b(please|kindly|sincerely|regards|respectfully|appreciate|inquire|regarding)\b/gi;
  const casualWords = /\b(hey|hi|yo|lol|haha|gonna|wanna|kinda|yeah|ok|cool|awesome|btw|thx)\b/gi;
  const formalCount = (text.match(formalWords) || []).length;
  const casualCount = (text.match(casualWords) || []).length;
  formal = Math.max(0, Math.min(1, 0.5 + (formalCount * 0.1) - (casualCount * 0.1)));

  // Verbose detection
  let verbose = Math.min(1, len / 100);

  // Emotional detection
  let emotional = 0.3;
  const emotionalWords = /\b(love|hate|amazing|terrible|frustrated|worried|excited|scared|angry|happy|sad|upset|thrilled|devastated)\b/gi;
  const exclamations = (text.match(/!/g) || []).length;
  const emotionalCount = (text.match(emotionalWords) || []).length;
  emotional = Math.max(0, Math.min(1, 0.3 + (emotionalCount * 0.08) + (exclamations * 0.05)));

  return {
    formal: Math.round(formal * 100) / 100,
    verbose: Math.round(verbose * 100) / 100,
    emotional: Math.round(emotional * 100) / 100
  };
}

module.exports = { detect };
