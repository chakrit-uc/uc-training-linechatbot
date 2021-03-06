
const debug = require("debug")("NodeChatBot:test-models-svc");
const util = require("util");
const ModelsSvcImpl_Firebase = require("../services/models-svc-impl-firebase");
const firestoreAccount = require("../firestore-service-account.json");

let modelsSvcConf = {
    serviceAccount: firestoreAccount,
    modelDefs: require("../models/firebase/chatbot-model-defs")
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
        /*return modelsSvcImpl.getCollection("chatbot-stickers");
    })
    .then((stickers) => {
        console.log("Got Stickers data: ", stickers);
        */
     
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
