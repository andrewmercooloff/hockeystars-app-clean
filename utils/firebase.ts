// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAW23Yco0-cj7nx0k1zzOz5488vA9IGUro",
  authDomain: "hockeystars-app.firebaseapp.com",
  databaseURL: "https://hockeystars-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hockeystars-app",
  storageBucket: "hockeystars-app.firebasestorage.app",
  messagingSenderId: "730937443919",
  appId: "1:730937443919:web:66b4ace78c4ca026184c3a",
  measurementId: "G-XEDJDHSHQ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { firestore }; 