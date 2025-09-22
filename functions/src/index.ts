/**
 * Main entry point for all Cloud Functions.
 * We are using explicit named exports to avoid conflicts.
 */

// Functions for the new staging workflow
export { createStagingBatchFromManualEntry } from './modules/staging';
export { processStagedUnit } from './modules/process';

// Existing functions from the invoices module
export { generateBillOfSale, generateJacketInvoice } from './modules/invoices';

// Other function modules like auth, docs, and packet are ignored for now
// to ensure the build succeeds. We can add them back later if needed.