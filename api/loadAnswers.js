import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, limit, query, startAfter, Timestamp } from 'firebase/firestore';

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
  try {
    const { after } = req.query;
    const perPage = 5;

    let q = query(collection(db, 'answers'), orderBy('timestamp', 'desc'), limit(perPage));

    if (after) {
      const afterTime = Timestamp.fromDate(new Date(after));
      q = query(collection(db, 'answers'), orderBy('timestamp', 'desc'), startAfter(afterTime), limit(perPage));
    }

    const snapshot = await getDocs(q);
    const answers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      answers,
      lastTimestamp: answers.length ? answers[answers.length - 1].timestamp : null
    });
  } catch (err) {
    console.error('❌ [API ERROR] /api/loadAnswers failed:', err.message);
    res.status(500).json({ error: 'Internal Server Error in loadAnswers API' });
  }
}
