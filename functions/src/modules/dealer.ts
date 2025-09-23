// functions/src/modules/dealer.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";

export const getDealerJackets = onCall({
    region: "us-central1",
    cors: true,
}, async (request) => {
    // 1. Ensure the user is a logged-in dealer
    if (!request.auth || !request.auth.token.dealer) {
        throw new HttpsError("unauthenticated", "You must be an approved dealer to access this resource.");
    }
    const dealerId = request.auth.uid;

    try {
        // 2. Perform the query on the backend with admin privileges
        const q = db.collection("jackets").where("dealerId", "==", dealerId);
        const snapshot = await q.get();

        if (snapshot.empty) {
            return [];
        }

        // 3. Format and return the data
        const jackets = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to strings so they can be sent as JSON
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate().toISOString() || null,
                auctionSaleDate: data.auctionSaleDate?.toDate().toISOString() || null,
            };
        });
        
        return jackets;

    } catch (error) {
        console.error("Error fetching dealer jackets:", error);
        throw new HttpsError("internal", "An error occurred while fetching jackets.");
    }
});