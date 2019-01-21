
const debug = require("debug")("NodeChatBot:main");
const util = require("util");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const LineChatBotSvcImpl = require("./services/linechatbot-svc-impl");
const _pkgInfo = require("./package.json");

let lineBotConf = _pkgInfo.LINEBot || {};
console.log(`LINE Bot channel ID: ${lineBotConf.channelID}`);
let lineBotSvcImpl = LineChatBotSvcImpl(lineBotConf);
lineBotSvcImpl.init();

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

app.listen(port, (err) => {
   if (err) {
       console.error(err);
       process.exit(-1);
   }
   console.info(`App Listening on port: ${port}`);
   console.info("Press Ctrl+C to quit");
});

process.on("SIGINT", (params) => {
    console.warn("App terminating", params);
    process.exit(0);
});
