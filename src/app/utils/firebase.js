// Import the functions you need from the SDKs you need
import { getStorage} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey:process.env.FIREBASE,
    authDomain: "blog-app-428612.firebaseapp.com",
    projectId: "blog-app-428612",
    storageBucket: "blog-app-428612.appspot.com",
    messagingSenderId: "983668899006",
    appId: "1:983668899006:web:b10a1606406c1650e5b2ef"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);