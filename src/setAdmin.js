
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountPath = './rizeup-dealer-connect-service-account.json';

// Check if the service account key file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: Service Account Key file not found!');
  console.error(`Please download the service account key for this project, rename it to "${serviceAccountPath.replace('./', '')}", and place it in the root directory.`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}


const email = process.argv[2];

if (!email) {
  console.error('ERROR: Please provide an email address as an argument.');
  process.exit(1);
}

async function setAdminClaim() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    const existingClaims = user.customClaims || {};
    
    await admin.auth().setCustomUserClaims(user.uid, { 
      ...existingClaims, 
      admin: true, 
      role: 'admin' 
    });

    console.log(`✅ Success! ${email} has been made an admin.`);
    console.log("Log out and log back in to see the changes.");
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

setAdminClaim();
