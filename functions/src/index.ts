// functions/src/index.ts
import "./config";

export { signInWithCustomToken, manageDealerApplication, generateJacketId } from "./modules/auth";
export { createStagingBatchFromManualEntry } from "./modules/staging";
export { processStagedUnit, createJacketsForInvoice } from "./modules/process";
export { generateJacketInvoice, generateBillOfSale } from "./modules/invoices";
export { generateJacketPacket } from "./modules/packet";
export { getDealerJackets } from "./modules/dealer";
export { generateReassignmentForm } from "./modules/reassignment"; // ADDED