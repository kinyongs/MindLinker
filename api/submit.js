import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';



const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, wordPair } = req.body;

  if (!text || !wordPair) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await addDoc(collection(db, 'answers'), {
      text,
      wordPair,
      timestamp: new Date().toISOString()
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving answer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
  await addDoc(collection(db, 'answers'), {
    text,
    wordPair,
    timestamp: Timestamp.now()
  });


}
