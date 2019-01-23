
const debug = require("debug")("NodeChatBot:main");
const path = require("path");
const util = require("util");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const ModelsSvcImpl_Firebase = require("./services/models-svc-impl-firebase");
const LineChatBotSvcImpl = require("./services/linechatbot-svc-impl");
const _pkgInfo = require("./package.json");

const envType = process.env.NODE_ENV || "dev";
const dotenv = require('dotenv').config({
    path: ((envType) || (envType === 0))
        ? path.join(process.cwd(), `${envType}.env`)
        : path.join(process.cwd(), ".env")
});
if (dotenv.error) {
    console.error(dotenv.error);
}
debug(`DEBUG: Environment Variables: ${util.inspect(process.env)}`);

let firebaseConf = _pkgInfo.Firebase || {};
if (process.env.GCLOUD_SVC_ACCT_NAME) {
    let svcAcctName = process.env.GCLOUD_SVC_ACCT_NAME;
    let gcProjectID = process.env.GCLOUD_SVC_ACCT_PROJECT_ID;
    firebaseConf.serviceAccount = {
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
if (!firebaseConf.serviceAccount) {
    try {
        firebaseConf.serviceAccount = require(`./firestore-service-account.${envType}.json`);
    } catch (err) {
        console.log(err.message);
    }
}
if (!firebaseConf.serviceAccount) {
    try {
        firebaseConf.serviceAccount = require("./firestore-service-account.json");
    } catch (err) {
        console.log(err.message);
    }
}
//console.log(`Firebase DB URL: ${firebaseConf.databaseURL}`);
let modelsSvcConf = {
    serviceAccount: firebaseConf.serviceAccount,
    //clientConfig: firebaseConf.client,
    models: require("./models/firebase/chatbot-model-defs")
};
debug(`DEBUG: Creating Models Service Implementation - Firebase with config: ${util.inspect(modelsSvcConf)}`);
let modelsSvcImpl = ModelsSvcImpl_Firebase(modelsSvcConf);

let lineBotSvcImpl;

module.exports = modelsSvcImpl.init()
    .then(() => {
        let lineBotConf = _pkgInfo.LINEBot || {};
        (process.env.LINE_CHANNEL_ID) && (lineBotConf.channelID = process.env.LINE_CHANNEL_ID);
        (process.env.LINE_CHANNEL_SECRET) && (lineBotConf.channelSecret = process.env.LINE_CHANNEL_SECRET);
        (process.env.LINE_CHANNEL_TOKEN) && (lineBotConf.channelToken = process.env.LINE_CHANNEL_TOKEN);
        lineBotConf.modelsService = modelsSvcImpl;
        console.log(`LINE Bot channel ID: ${lineBotConf.channelID}`);
        lineBotSvcImpl = LineChatBotSvcImpl(lineBotConf);
    
        return lineBotSvcImpl.init();
    })
    .then(() => {
        let app = express();

        app.use(morgan("combined"));
        //app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        app.post("/webhook", (req, resp, next) => {
            let body = req.body;
            console.log(`${req.url} => ${util.inspect(body)}`); //, body);
            return lineBotSvcImpl.handleWebhookRequest(req, resp, next);
        });

        app.get((req, resp, next) => {
            let err = new Error("Not Found");
            err.statusCode = 404;
            next(err);
        });
        app.use((err, req, resp, next) => {
            let statusCode = err.statusCode || 500;
            (statusCode >= 500) && console.error(err);
            resp.status(statusCode);
              //.set("Content-type", "application-json");
            resp.json({ errorMessage: err.message || "ERROR" });
        });

        let port = process.env.PORT || 3000;

        return new Promise((resolve, reject) => {
            app.listen(port, (err) => {
                if (err) {
                    return reject(err);
                    //console.error(err);
                    //process.exit(-1);
                }
                console.info(`App Listening on port: ${port}`);
                console.info("Press Ctrl+C to quit");

                resolve(true);
            });
        });
    })
    .then(() => {
        return new Promise((resolve, reject) => {
            process.on("SIGINT", (params) => {
                console.warn("App terminating", params);
                let rc = ((params) ? params.returnCode : null) || 0;
                resolve(rc);
                process.exit(rc);
            });
        });
    })
    .catch((err) => {
        console.error(err);
        process.exit(-1);
    });
