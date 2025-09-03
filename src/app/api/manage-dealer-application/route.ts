// IMPORTANT: This file should be deployed as a Cloud Function.
// It is structured as a Next.js API route for local development testing,
// but the core logic is intended for a secure, serverless backend environment.

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { auth, db } from '@/lib/firebase-admin'; // Using admin SDK

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const idToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Security Check: Ensure the caller is an admin
    if (decodedToken.role !== 'admin') {
       return NextResponse.json({ error: 'Permission denied: Caller is not an admin.' }, { status: 403 });
    }
    
    const { uid, action } = await req.json();

    if (!uid || !action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid input: Missing uid or action' }, { status: 400 });
    }

    const userDocRef = db.collection('users').doc(uid);

    if (action === 'approve') {
      // Set custom claim for the user
      await auth.setCustomUserClaims(uid, { role: 'dealer' });
      // Update user status in Firestore
      await userDocRef.update({ status: 'approved' });
      
    } else if (action === 'deny') {
      // Update user status in Firestore
      await userDocRef.update({ status: 'denied' });
    }
    
    // In a real Cloud Function, you might also want to trigger an email notification here.

    return NextResponse.json({ success: true, message: `User ${uid} has been ${action}d.` });

  } catch (error: any) {
    console.error('Error managing dealer application:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export { handler as POST };
