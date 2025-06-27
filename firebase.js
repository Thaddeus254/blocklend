// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDpP8-ExampleKey12345678AbCdEfGhiJKLm",           // ✅ Safe to expose
  authDomain: "blocklend-12345.firebaseapp.com",
  projectId: "blocklend-12345",
  storageBucket: "blocklend-12345.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd1234efgh5678",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);         // Used for login/signup
export const db = getFirestore(app);      // Used for storing user roles etc.
