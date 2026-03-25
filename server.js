const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Initialize Firebase
const serviceAccount = require("./firebase-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "YOUR_FIREBASE_URL"
});
const db = admin.database();

// API KEYS
const HUMANITY_KEY = "e61fb3d4aebf87f52f104ec8cae41bbf21fc231e";
const PAYSCRIBE_KEY = "YOUR_PAYSCRIBE_KEY"; 

// --- 1. NIN SERVICE ---
app.post('/api/nin', async (req, res) => {
    const { uid, nin } = req.body;
    const cost = 100;

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();

    if (user.balance < cost) return res.status(400).send("Insufficient Balance");

    try {
        const response = await axios.post('https://humanitytrust.com.ng/api/nin-search1/', 
            { nin: nin }, 
            { headers: { 'Authorization': `Token ${HUMANITY_KEY}` } }
        );
        
        await userRef.update({ balance: user.balance - cost });
        res.json(response.data);
    } catch (e) { res.status(500).send("NIN API Error"); }
});

// --- 2. DATA/AIRTIME SERVICE (Payscribe) ---
app.post('/api/payscribe/data', async (req, res) => {
    const { uid, network, amount, phone, planCode } = req.body;

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();

    if (user.balance < amount) return res.status(400).send("Insufficient Balance");

    try {
        // Payscribe API call logic
        const response = await axios.post('https://api.payscribe.ng/v1/data', {
            network: network,
            plan: planCode,
            phone: phone
        }, { headers: { 'Authorization': `Bearer ${PAYSCRIBE_KEY}` } });

        await userRef.update({ balance: user.balance - amount });
        res.json({ status: "Success", details: response.data });
    } catch (e) { res.status(500).send("Payscribe Error"); }
});

app.listen(3000);