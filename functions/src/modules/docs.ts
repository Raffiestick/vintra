
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertAdmin, bucket, db, FieldValue } from "../config";

export const attachStagedDocToJacket = onCall(
  { region: "us-central1" },
  async (request) => {
    assertAdmin(request);
    const { docId, vin, typeOverride } = request.data || {};
    if (!docId || !vin) throw new HttpsError("invalid-argument", "docId and vin are required.");

    const stagedDocRef = db.collection("stagedDocs").doc(docId);
    const stagedDocSnap = await stagedDocRef.get();
    if (!stagedDocSnap.exists) throw new HttpsError("not-found", "Staged document not found.");
    const stagedDoc = stagedDocSnap.data() as any;

    const gcsPath: string | undefined = stagedDoc.gcsPath;
    if (!gcsPath) throw new HttpsError("failed-precondition", "Staged document missing gcsPath.");

    const fileName = gcsPath.split("/").pop() || `doc-${Date.now()}`;
    const docType = typeOverride || stagedDoc.type || "other";
    const newPath = `jacket-documents/${vin}/${docType}/${fileName}`;

    await bucket.file(gcsPath).copy(newPath); // copy instead of move so staging remains intact

    const newFile = bucket.file(newPath);
    const [signedUrl] = await newFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const newDocument = {
      id: `doc-${Date.now()}`,
      name: fileName,
      type: docType,
      url: signedUrl,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection("jackets").doc(vin).update({
      documents: FieldValue.arrayUnion(newDocument),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await stagedDocRef.delete().catch(() => {}); // optional

    return { success: true, message: `Document attached to jacket ${vin}.` };
  }
);
