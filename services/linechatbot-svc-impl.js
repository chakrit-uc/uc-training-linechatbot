
/* global Promise */

const debug = require("debug")("NodeChatBot:linechatbot-svc-impl");
const util = require("util");
const EventEmitter = require("events");
const crypto = require('crypto');
const LineBotAPI = require('@line/bot-sdk');
const UCUtils = require("../lib/uc-utils-node");

module.exports = function (opts) {
    let opts2 = opts || {};
    
    let channelID = opts2.channelID;
    let channelSecret = opts2.channelSecret;
    let channelToken = opts2.channelToken;
    
    const svcImpl = {
        apiClient: null,
        channelID: opts2.channelID,
        channelSecret: opts2.channelSecret,
        channelToken: opts2.channelToken,
        
        init: function() {
            const svc = this;
            
            this.apiClient = new LineBotAPI.Client({
                channelAccessToken: svc.channelToken
            });
              
            this.on("line-follow", this.onFollow.bind(this));
            this.on("line-join", this.onGroupJoin.bind(this));
            this.on("line-memberJoin", this.onAnotherMemberJoin.bind(this));
            this.on("line-message", this.onIncomingMessage.bind(this));
            //this.on("line-leave", this.onGroupLeave.bind(this));
            //this.on("line-memberLeave", this.onMemberLeave.bind(this));
            //this.on("line-unfollow", this.onUnfollow.bind(this));
            
            return true;
        },
        handleWebhookRequest: function(req, resp, next) {  
            const svc = this;
            
            let sig = req.get("X-LINE-Signature");
            let body = req.body;
            let sigValid = false;
            let sigErr;
            try {
                sigValid = this.verifyLineSignature(sig, body);
            } catch (err) {
                sigErr = err;
            }
            if (!sigValid) {
                sigErr = sigErr || new Error("Forbidden");
                sigErr.statusCode = 403;
                return next(sigErr);
            }

            let status = "ok";
            let proms = [];
            (body.events) && body.events.forEach((evt) => {
                console.log(`Dispatching LINE Webhook Event: ${evt.type}`);
                svc.emit(`line-${evt.type}`, evt);
                /*
                switch (evt.type) {
                    case "follow":
                        results.push(this.onFollow(evt));
                        break;
                    case "message":
                        results.push(this.onIncomingMessage(evt.message, evt));
                        break;
                    default:
                        break;
                }
                */
            });
            return Promise.all(proms)
                .then((results) => {
                    console.log(`Webhook results: ${results}`);
                    status = status || "ok";
                    resp.json({
                        status: status //,
                        //body: body
                    });
                });
        },
        
        verifyLineSignature: function(sig, evtParams) {
            if (!sig) {
                throw new Error("No signature received");
            }
            console.log(`Verifying LINE Signature: ${sig}`);
            //TODO:
            return true;
        },
        onGroupJoin: function(evtParams) {
            let replyToken = (evtParams) ? evtParams.replyToken : null;
            
            return this.sendGreetingMessage(replyToken, evtParams);
        },
        onAnotherMemberJoin: function(evtParams) {
            let replyToken = (evtParams) ? evtParams.replyToken : null;
            
            return this.sendGreetingMessage(replyToken, evtParams);
        },
        onFollow: function(evtParams) {
            let replyToken = (evtParams) ? evtParams.replyToken : null;
            
            return this.sendGreetingMessage(replyToken, evtParams);
        },
        onIncomingMessage: function(evtParams) {
            let status = "ok";
            
            if (!evtParams) {
                return status;
            }
            let replyToken = evtParams.replyToken;
            let msg = evtParams.message;
            if (!msg) {
                return status;
            }
            
            let replyMsg;
            switch (msg.type) {
                case "text":
                    let msgText = msg.text;
                    console.log(`Got text msg#${msg.id}: ${msgText}`);
                    replyMsg = {
                        type: "text",
                        text: `Thanks for ${msgText}!`
                    };
                    return this.replyToMessage(replyToken, replyMsg, evtParams);
                case "sticker":
                    console.log(`Got sticker msg#${msg.id}: ${msg.packageId}/${msg.stickerId}`);
                    replyMsg = {
                        type: "sticker",
                        packageId: msg.packageId,
                        stickerId: msg.stickerId
                    };
                    return this.replyToMessage(replyToken, replyMsg, evtParams);
                default:
                    console.log(`Got msg: ${util.inspect(msg)}`);
                    break;
            }
            
            return Promise.resolve(status);
        },
        onUnfollow: function(evtParams) {
        },
        
        sendGreetingMessage: function(replyToken, evtParams) {
            const svc = this;
            
            let msgs = [
                {
                    type: "text",
                    text: "สวัสดีชาวโลก Hello Earth people!"
                },
                {
                    type: "text",
                    text: "เรามาอย่างสันติ We come in peace!"
                },
                {
                    type: "sticker",
                    packageId: "2",
                    stickerId: "501"
                }
            ];
            
            console.log(`Sending Greeting Msg#${replyToken}: ${util.inspect(msgs)}`);
            
            return this.apiClient.replyMessage (replyToken, msgs)
              .then(() => {
                  console.log(`Sent Greeting Msg#${replyToken} successfully`);
              })
              .catch((err) => {
                  console.error(`Sent Greeting Msg#${replyToken} failed: `, err);
                  svc.on("error", err);
              });
        },
        replyToMessage: function(replyToken, replyMsg, evtParams) {
            const svc = this;
            
            console.log(`Sending Reply Msg#${replyToken}: ${replyMsg}`);
            
            return this.apiClient.replyMessage (replyToken, replyMsg)
              .then(() => {
                  console.log(`Sent Reply Msg#${replyToken} successfully`);
              })
              .catch((err) => {
                  console.error(`Sent Reply Msg#${replyToken} failed: `, err);
                  svc.on("error", err);
              });
        }
    };
    UCUtils.updateFrom(svcImpl, EventEmitter.prototype);
    EventEmitter.call(svcImpl);
    
    return svcImpl;
};

