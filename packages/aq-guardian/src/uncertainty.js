// @aq/guardian — Honest uncertainty responses
'use strict';

/**
 * Generate an honest "I don't know" response instead of hallucinating.
 * This is BETTER than a wrong answer. Always.
 *
 * @param {string} question - The question that was asked
 * @param {Object} [context]
 * @param {string} [context.channel] - 'phone' | 'sms' | 'email' | 'chat'
 * @param {string} [context.client_name] - Client's name
 * @returns {string} A channel-appropriate honest uncertainty response
 */
function honestUncertainty(question, context = {}) {
  const { channel, client_name } = context;

  const responses = {
    phone: [
      `That's a great question, ${client_name || 'and I want to make sure I give you the right answer'}. Let me check on that and get back to you, or I can transfer you to someone who can help you right now. Which would you prefer?`,
      `I want to be completely honest with you — I'm not 100% certain about that specific detail. Rather than give you wrong information, let me find the exact answer and get back to you within the hour. Would that work for you?`,
      `I appreciate you asking. I don't want to guess on something this important. Let me verify that for you and follow up. Can I reach you at this number?`
    ],
    sms: [
      `Great question! I want to make sure I give you accurate info on this. Let me check and get back to you shortly.`,
      `Thanks for asking — I want to verify this detail so I give you the right answer. I'll follow up within the hour.`
    ],
    email: [
      `Thank you for your question. I want to ensure I provide you with completely accurate information, so I'm going to verify this detail and follow up with you shortly.`,
    ],
    chat: [
      `That's a good question! Let me check on that specific detail so I can give you the right information. I'll get back to you shortly, or I can connect you with someone who might know right away.`,
    ]
  };

  const channelResponses = responses[channel] || responses.chat;
  return channelResponses[Math.floor(Math.random() * channelResponses.length)];
}

module.exports = { honestUncertainty };
