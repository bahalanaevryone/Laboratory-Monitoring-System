// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9AJfeiKBuJfuMfA0U7O3Gpx9wvvZN7ME",
  authDomain: "monitoring-system-f9a2c.firebaseapp.com",
  projectId: "monitoring-system-f9a2c",
  storageBucket: "monitoring-system-f9a2c.firebasestorage.app",
  messagingSenderId: "546474737498",
  appId: "1:546474737498:web:934736ecfd0c1da17d3d63",
  measurementId: "G-QTM4XHRV5E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { app, analytics };
