// @aq/guardian — Business agent fallback preset
'use strict';

/**
 * Default fallback strategies for common business agent types.
 */
const businessFallbacks = {
  communications: {
    answer_call: { description: 'Route to voicemail with custom greeting', action: 'voicemail_fallback' },
    send_textback: { description: 'Queue for retry in 60 seconds', action: 'retry_queue' },
    save_transcript: { description: 'Save raw audio, transcribe later', action: 'deferred_transcription' },
    DEFAULT: { description: 'Log error, notify owner', action: 'notify_owner' }
  },
  leads: {
    capture_lead: { description: 'Save raw data, process later', action: 'raw_save' },
    respond_to_dm: { description: 'Send "We received your message" acknowledgment', action: 'acknowledge' },
    DEFAULT: { description: 'Queue for manual processing', action: 'manual_queue' }
  },
  scheduling: {
    book_appointment: { description: 'Offer to call back to book', action: 'callback_offer' },
    send_reminder: { description: 'Batch send on recovery', action: 'batch_retry' },
    DEFAULT: { description: 'Preserve appointment data, retry', action: 'retry_queue' }
  },
  reviews: {
    respond_to_review: { description: 'Queue response for manual approval', action: 'manual_approve' },
    DEFAULT: { description: 'Log review, process later', action: 'deferred' }
  },
  billing: {
    create_invoice: { description: 'Save invoice data, retry creation', action: 'retry_queue' },
    process_payment: { description: 'Log payment intent, reconcile later', action: 'manual_reconcile' },
    DEFAULT: { description: 'No financial data lost — atomic transactions', action: 'retry_queue' }
  }
};

module.exports = businessFallbacks;
