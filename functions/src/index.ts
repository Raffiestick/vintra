// functions/src/index.ts

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
export {
    generateJacketInvoice,
    generateBillOfSale,
} from "./modules/invoices";

export { generateJacketPacket } from "./modules/packet";