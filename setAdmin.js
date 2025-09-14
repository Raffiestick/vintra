
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountPath = './rizeup-dealer-connect-service-account.json';

// Check if the service account key file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: Service Account Key file not found!');
  console.error(`Please make sure the file named "${serviceAccountPath.replace('./', '')}" is in the root directory of your project.`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// --- DIAGNOSTIC CHECK ---
console.log(`Verifying Project ID from service account...`);
if (serviceAccount.project_id) {
    console.log(`Project ID: ${serviceAccount.project_id}`);
    if (serviceAccount.project_id !== 'rizeup-dealer-connect-n6k7r') {
        console.error('\n*** WARNING: The service account project ID does not match the expected project ID "rizeup-dealer-connect-n6k7r". ***');
        console.error('*** Please ensure you have downloaded and uploaded the correct service account key for this project. ***\n');
    }
} else {
    console.error('*** WARNING: Could not find "project_id" in the service account file. ***');
}
// -------------------------

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://rizeup-dealer-connect-n6k7r.firebaseio.com'
  });
}


const email = process.argv[2];

if (!email) {
  console.error('ERROR: Please provide an email address as an argument.');
  process.exit(1);
}

async function setAdminClaim() {
  try {
    // --- DIAGNOSTIC CHECK ---
    console.log(`\nAttempting to find user with email: "${email}"`);
    // -------------------------
    const user = await admin.auth().getUserByEmail(email);
    const existingClaims = user.customClaims || {};
    
    await admin.auth().setCustomUserClaims(user.uid, { 
      ...existingClaims, 
      admin: true, 
      role: 'admin' 
    });

    console.log(`\n✅ Success! ${email} has been made an admin.`);
    console.log("Log out and log back in to see the changes.");
  } catch (error) {
    console.error('\nError:', error.message);
  }
  process.exit(0);
}

setAdminClaim();
