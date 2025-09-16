
import { setGlobalOptions } from "firebase-functions/v2";

// Set global options for all functions in this project
setGlobalOptions({ region: "us-central1", memory: "1GiB", timeoutSeconds: 300 });

// Re-export all your functions from small modules
export { signInWithCustomToken, manageDealerApplication, generateJacketId } from "./modules/auth";
export { createJacketFromUnit, createJacketsForInvoice } from "./modules/staging";
export { attachStagedDocToJacket } from "./modules/docs";
export { generateJacketInvoice, generateBillOfSale } from "./modules/invoices";
export { generateJacketPacket } from "./modules/packet";

// Keep placeholder so CLI won't try to delete if you had this name deployed.
export { startDocParse } from "./placeholder";
