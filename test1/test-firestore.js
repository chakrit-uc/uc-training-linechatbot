
/* global Promise */

const firebaseAdmin = require('firebase-admin');
const debug = require("debug")("NodeChatBot:test-firestore");
const util = require("util");

const firestoreAccount = require("../firestore-service-account.json");

let prom1;
try {
    let app = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(firestoreAccount)
    });
    console.log("Got Firebase App instance: ", app);
    
    let db = app.firestore();
    console.log("Got Firestore DB instance: ", db);
    
    let modelRef = db.collection("chatbot-stickers");
    console.log("Got Collection Ref.: ", modelRef);
    
    prom1 = modelRef.get()
        .then((snapshot) => {
            console.log("Got Snapshot: ", snapshot);
          
            let stickers = [];
            (snapshot) && snapshot.forEach((doc) => {
                let sticker = doc.data();
                stickers.push(sticker);
            });
            console.log("Got Data: ", stickers);
          
            return Promise.resolve(stickers);
        })
        .catch((err) => {
            console.error(err);
            return Promise.reject(err);
        });
      
} catch (err) {
    console.error(err);
    prom1 = Promise.reject(err);
}

module.exports = prom1;
