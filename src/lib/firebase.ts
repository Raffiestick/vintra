// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjhaoaB2BQobm4NWDeJ4ePP-ExVBB77dg",
  authDomain: "rizeup-dealer-connect-n6k7r.firebaseapp.com",
  projectId: "rizeup-dealer-connect-n6k7r",
  storageBucket: "rizeup-dealer-connect-n6k7r.appspot.com",
  messagingSenderId: "1000941113781",
  appId: "1:1000941113781:web:1fb421a893eafe977409fc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
