import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

export const manageDealerApplication = functions.https.onCall(async (data, context) => {
  // Check authentication and admin role.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const callerUid = context.auth.uid;
  const userRecord = await auth.getUser(callerUid);
  const customClaims = userRecord.customClaims;

  if (customClaims?.role !== "admin") {
     throw new functions.https.HttpsError(
      "permission-denied",
      "The caller does not have administrative privileges."
    );
  }

  const { uid, action } = data;

  if (!uid || !action || !["approve", "deny"].includes(action)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'uid' and 'action' ('approve' or 'deny')."
    );
  }

  const userDocRef = db.collection("users").doc(uid);

  try {
    if (action === "approve") {
      // Set custom claim for the user to give them dealer role
      await auth.setCustomUserClaims(uid, { role: "dealer" });
      // Update user status in Firestore
      await userDocRef.update({ status: "approved" });
      
    } else if (action === "deny") {
      // Update user status in Firestore
      await userDoc-ref.update({ status: "denied" });
    }

    // You can also add email notifications here.

    return { success: true, message: `User ${uid} has been ${action}d.` };
  } catch (error) {
    console.error("Error managing dealer application:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while managing the application."
    );
  }
});
