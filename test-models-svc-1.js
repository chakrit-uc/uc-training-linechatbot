
/* global Promise */

const debug = require("debug")("NodeChatBot:test-models-svc-1");
const util = require("util");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const ModelsSvcImpl_Firebase = require("./services/models-svc-impl-firebase");
//const LineChatBotSvcImpl = require("./services/linechatbot-svc-impl");
//const _pkgInfo = require("./package.json");

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
        firestoreAccount = require("./firestore-service-account.json");
    } catch (err) {
        console.log(err.message);
    }
}

let modelsSvcConf = {
    serviceAccount: firestoreAccount,
    autoConnect: true,
    modelDefs: require("./models/firebase/chatbot-model-defs")
};
let modelsSvcImpl = ModelsSvcImpl_Firebase(modelsSvcConf);

let prom1;
try {
    prom1 = modelsSvcImpl.init();
} catch (err) {
    prom1 = Promise.reject(err);
}

prom1
    .then(() => {
        return modelsSvcImpl.getCollection("chatbot-greetings", {}, {
            orderBy: "weight",
            orderDesc: true,
            includeRefs: [
                "messages", 
                "messages.sticker"
            ]
        });
    })
    .then((greetings) => {
        console.log("Got Greeting Message Sets: ", util.inspect(greetings, false, 4));
      
        return modelsSvcImpl.getCollection("chatbot-replies", {}, {
            orderBy: "weight",
            orderDesc: true,
            includeRefs: [
                "replyMessages", 
                "replyMessages.sticker"
            ]
        });
    })
    .then((replies) => {
        console.log("Got Reply Message Sets: ", util.inspect(replies, false, 4));
      
        return modelsSvcImpl.cleanup();
    })
    .then(() => {  
        console.log("Done.");
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(-1);
    });
