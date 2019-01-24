
/* global Promise */

const firebaseAdmin = require('firebase-admin');
const debug = require("debug")("NodeChatBot:test-firestore");
const util = require("util");


let firestoreAccount; //= require("./firestore-service-account.json");
if (process.env.GCLOUD_SVC_ACCT_NAME) {
    let svcAcctName = process.env.GCLOUD_SVC_ACCT_NAME;
    let gcProjectID = process.env.GCLOUD_SVC_ACCT_PROJECT_ID;
    firestoreAccount = {
        "type": "service_account",
        client_id: process.env.GCLOUD_SVC_ACCT_CLIENT_ID,
        client_email: `${svcAcctName}@${gcProjectID}.iam.gserviceaccount.com`,
        project_id: gcProjectID,
        private_key_id: process.env.GCLOUD_SVC_ACCT_PRIVKEY_ID,
        private_key: process.env.GCLOUD_SVC_ACCT_PRIVKEY,
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/`
            + `${svcAcctName}%40${gcProjectID}.iam.gserviceaccount.com`,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    };
}
if (!firestoreAccount) {
    try {
        firestoreAccount = require("../firestore-service-account.json");
    } catch (err) {
        console.log(err.message);
    }
}

let prom1;
try {
    let app = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(firestoreAccount)
    });
    console.log("Got Firebase App instance: ", app);
    
    let db = app.firestore();
    console.log("Got Firestore DB instance: ", db);
    
    let modelRef = db.collection("chatbot-stickers").orderBy("weight", "desc");
    console.log("Got Collection Ref.: ", modelRef);
    
    prom1 = modelRef.get()
        .then((snapshot) => {
            console.log("Got Snapshot: ", snapshot);
          
            let stickers = [];
            (snapshot) && snapshot.forEach((doc) => {
                let sticker = doc.data();
                stickers.push(sticker);
            });
            console.log("Got Stickers Data: ", stickers);
          
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
