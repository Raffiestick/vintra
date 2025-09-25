import "./config"; // This is critical, do not remove.

// --- Core Application Functions ---
export { signInWithCustomToken, manageDealerApplication, generateJacketId } from "./modules/auth";
export { attachStagedDocToJacket } from "./modules/docs";
export { 
    generateJacketInvoice, 
    generateBillOfSale, 
    regenerateInvoiceOnChange 
} from "./modules/invoices";
export { generateJacketPacket } from "./modules/packet";

// --- Staging Workflow Functions ---
export { createStagingBatchFromManualEntry } from "./modules/staging";
export { processStagedUnit } from "./modules/process";

// --- Newly Added Functions ---
// NOTE: The build will only succeed if these files and functions actually exist.
export { getDealerJackets } from "./modules/dealer";
export { generateReassignmentForm } from "./modules/reassignment";