// functions/src/index.ts

/**
 * This line is CRUCIAL. It imports and runs the Firebase Admin configuration
 * which initializes the app. It must be the first line of this file.
 */
import "./config";

// --- Authentication & User Management ---
export {
    signInWithCustomToken,
    manageDealerApplication,
    generateJacketId,
} from "./modules/auth";

// --- Staging & Processing ---
export { createStagingBatchFromManualEntry } from "./modules/staging";
export { processStagedUnit } from "./modules/process";

// --- Document & Packet Generation ---
// export { attachStagedDocToJacket } from "./modules/docs"; // Temporarily disabled for debugging
export {
    generateJacketInvoice,
    generateBillOfSale,
} from "./modules/invoices";