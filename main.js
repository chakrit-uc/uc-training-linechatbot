
const debug = require("debug")("NodeChatBot:main");
const util = require("util");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const ModelsSvcImpl_Firebase = require("./services/models-svc-impl-firebase");
const LineChatBotSvcImpl = require("./services/linechatbot-svc-impl");
const _pkgInfo = require("./package.json");

let firebaseConf = _pkgInfo.Firebase || {};
firebaseConf.serviceAccount = require("./firestore-service-account.json");
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
