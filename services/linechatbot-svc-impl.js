
/* global Promise */

const EventEmitter = require("events");
const debug = require("debug")("NodeChatBot:linechatbot-svc-impl");
const util = require("util");
const crypto = require('crypto');
const LineBotAPI = require('@line/bot-sdk');
const UCUtils = require("../lib/uc-utils-node");

module.exports = function (opts) {
    let opts2 = opts || {};
    
    let svcImpl;
    svcImpl = {
        apiClient: null,
        channelID: opts2.channelID,
        channelSecret: opts2.channelSecret,
        channelToken: opts2.channelToken,
        modelsService: opts2.modelsService,
        
        init: function() {
            const svc = this;
            let proms = [];
            
            if (!this.modelsService) {
                return Promise.reject(new Error("Missing dependency: modelsService"));
            }
            
            this.apiClient = new LineBotAPI.Client({
                channelAccessToken: svc.channelToken
            });
              
            this.on("error", this.onError.bind(this));
            this.on("line-follow", this.onFollow.bind(this));
            this.on("line-join", this.onGroupJoin.bind(this));
            this.on("line-memberJoin", this.onAnotherMemberJoin.bind(this));
            this.on("line-message", this.onIncomingMessage.bind(this));
            //this.on("line-leave", this.onGroupLeave.bind(this));
            //this.on("line-memberLeave", this.onMemberLeave.bind(this));
            //this.on("line-unfollow", this.onUnfollow.bind(this));
            
            //TEST {
            /*
            proms.push(this.modelsService.getCollection("chatbot-stickers")
                .then((snapshot) => {
                    let stickers = [];
                    (snapshot) && snapshot.forEach((doc) => {
                        if ((doc) && (doc.exists)) {
                            stickers.push(doc.data());
                        }
                    });
                    debug(`DEBUG: Got stickers info: ${util.inspect(stickers)}`);
                    
                    return Promise.resolve(stickers);
                })
                .catch((err) => {
                    svc.emit("error", err);
                    return Promise.reject(err);
                })
            );
            */
            // }
            
            return Promise.all(proms)
                .then(() => {
                    return Promise.resolve(true);
                });
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
        
        verifyLineSignature: function(sig, body) {
            if (!sig) {
                throw new Error("No signature received");
            }
            console.log(`Verifying LINE Signature: ${sig}`);
            let bodyStr = ((body) && (typeof body === "object"))
                ? JSON.stringify(body)
                : `${body}`;
            let digest = crypto
                .createHmac('SHA256', this.channelSecret)
                .update(bodyStr)
                .digest('base64');
            console.log(`${bodyStr} => ${digest}`);
            
            //FOR TEST ONLY {
            if (sig === "AbRaCaDaBrA") {
                return true;
            }
            // }
            
            if (sig !== digest) {
                throw new Error("Invalid LINE Signature");
            }
            
            //return (sig === digest);
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
                    /*
                    replyMsg = {
                        type: "text",
                        text: `Thanks for ${msgText}!`
                    };
                    */
                    return this.processIncomingMessage(replyToken, msg, evtParams);
                case "sticker":
                    console.log(`Got sticker msg#${msg.id}: ${msg.packageId}/${msg.stickerId}`);
                    /*
                    replyMsg = {
                        type: "sticker",
                        packageId: msg.packageId,
                        stickerId: msg.stickerId
                    };
                    */
                    return this.processIncomingMessage(replyToken, msg, evtParams);
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
            let userID = ((evtParams) && (evtParams.source) && (evtParams.source.type === "user"))
                ? evtParams.source.userId
                : null;
            let groupID = ((evtParams) && (evtParams.source) && (evtParams.source.type === "group"))
                ? evtParams.source.groupId
                : null;
            
            //TODO:
            let filters = (row) => {
                let match = true;
                if (row.userPattern) {
                    let regExp = new RegExp(row.userPattern, "i");
                    match = match && regExp.test(userID);
                }
                if (row.groupPattern) {
                    let regExp = new RegExp(row.groupPattern, "i");
                    match = match && regExp.test(groupID);
                }
                debug(`DEBUG: sendGreetingMessage().postFilter(${util.inspect(row)}): ${util.inspect(evtParams)} => ${match}`);
                
                return match;
            };
            
            console.log(`Searching greeting messages for user#${userID}`);
            let msgs2 = [];
            
            return this.modelsService.getCollection("chatbot-greetings") //, filters)
              .then((items) => {
                  let msgSets = [];
                
                  (items) && items.forEach((item) => {
                        if (!filters(item)) {
                            return false;
                        }
                        if ((item.messages) && (item.messages.length >= 1)) {
                            msgSets.push(item);
                        }
                    });
                  
                    /*
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
                    */
           
                    if ((!msgSets) || (msgSets.length < 1)) {
                        console.log("No Greeting Message found matching condition");
                        return Promise.resolve(false);
                    }
                    
                    let proms2 = [];
                    let msgSetInfo = msgSets[0];
                    debug(`DEBUG: Selected Greeting Messages Set: ${util.inspect(msgSetInfo)}`);
                    
                    msgSetInfo.modelKey = "chatbot-greetings";
                    let msgs = msgSetInfo.messages;
                    msgs.forEach((msg) => {
                        proms2.push(svc.processOutgoingMessage(msg, msgSetInfo)
                            .then((msg2) => {
                                msgs2.push(msg2);
                                return Promise.resolve(msg2);
                            })
                            .catch((err) => {
                                svc.emit("error", err);
                                return Promise.reject(err);
                            })
                        );
                    });
                    
                    return Promise.all(proms2);
                })
                .then((results) => {
                    
                    console.log(`Sending Greeting Msg(s)#${replyToken}: ${util.inspect(msgs2)}`);
            
                    return this.apiClient.replyMessage(replyToken, msgs2)
                        .then((results) => {
                            console.log(`Sent Greeting Msg(s)#${replyToken} successfully`);
                            return Promise.resolve(results);
                        });
                })
                .catch((err) => {
                    console.error(`Sending Greeting Msg(s)#${replyToken} failed: `, err);
                    svc.emit("error", err);
                });
        },
        processIncomingMessage: function(replyToken, srcMsg, evtParams) {
            const svc = this;
            let userID = ((evtParams) && (evtParams.source) && (evtParams.source.type === "user"))
                ? evtParams.source.userId
                : null;
            
            let proms1 = [];
            let stickerInfo;
            switch (srcMsg.type) {
                case "text":
                    break;
                case "sticker":
                    proms1.push(
                        svc.addUpdateStickerInfo(srcMsg.packageId, srcMsg.stickerId, (stickerInfo) => {
                            stickerInfo.inFrequency = stickerInfo.inFrequency || 0;
                            stickerInfo.inFrequency++;
                        })
                            .catch((err) => {
                                svc.emit("error", err);
                                return Promise.resolve(false);
                            })
                    );
                    break;
                default:
                    break;
            }
                
            //TODO:
            let filters = (row) => {
                let match = true;
                if (row.userPattern) {
                    //match = match && ();
                }
                if (row.msgTypePattern) {
                    let regExp = new RegExp(row.msgTypePattern, "i");
                    match = match && regExp.test(srcMsg.type);
                }
                if (row.msgPattern) {
                    let regExp = new RegExp(row.msgPattern, "i");
                    switch (srcMsg.type) {
                        case "text":
                            match = match && regExp.test(srcMsg.text);
                            break;
                        case "sticker":
                            match = (stickerInfo)
                                ? (match && regExp.test(stickerInfo.notes))
                                : null;
                            break;
                        default:
                            match = false;
                            break;
                    }
                }
                
                debug(`DEBUG: processIncomingMessage().postFilter(${util.inspect(row)}): ${util.inspect(srcMsg)} => ${match}`);
                
                return match;
            };
            
            console.log(`Searching reply messages for user#${userID}`);
            let replyMsgs2 = [];
            
            return Promise.all(proms1)
                .then((results) => {
                    return this.modelService.getCollection("chatbot-replies") //, filters);
                })
                .then((items) => {
                  let msgSets;
                
                  (items) && items.forEach((item) => {
                        if (!filters(item)) {
                            return false;
                        }
                        if ((item.messages) && (item.messages.length >= 1)) {
                            msgSets.push(item);
                        }
                    });
                    if ((!msgSets) || (msgSets.length < 1)) {
                        console.log("No Reply Message found matching conditions");
                        return Promise.resolve(false);
                    }
                    
                    let proms2 = [];
                    let msgSetInfo = msgSets[0];
                    debug(`DEBUG: Selected Reply Messages Set: ${util.inspect(msgSetInfo)}`);
                    
                    msgSetInfo.modelKey = "chatbot-replies";
                    let replyMsgs = msgSetInfo.replyMessages;
                    replyMsgs.forEach((replyMsg) => {
                        proms2.push(svc.processOutgoingMessage(replyMsg, msgSetInfo)
                            .then((replyMsg2) => {
                                replyMsgs2.push(replyMsg2);
                                return Promise.resolve(replyMsg2);
                            })
                            .catch((err) => {
                                svc.emit("error", err);
                                return Promise.reject(err);
                            })
                        );
                    });
                    
                    return Promise.all(proms2);
                })
                .then((results) => {
                    console.log(`Sending Reply Msg(s)#${replyToken}: ${util.inspect(replyMsgs2)}`);

                    return svc.apiClient.replyMessage(replyToken, replyMsgs2);
                })
                .then((results) => {
                    console.log(`Sent Reply Msg(s)#${replyToken} successfully`);
                    return Promise.resolve(results);
                })
                .catch((err) => {
                    console.error(`Failed Sending Reply Msg(s)#${replyToken}: `, err);
                    svc.emit("error", err);
                });
        },
        processOutgoingMessage: function(msg, msgSetInfo) {
            const svc = this;
            
            let proms1 = [];
            let msg2;
            let stickerInfo;
            let imgInfo;
            switch (msg.msgType) {
                case "text":
                    msg2 = {
                        type: msg.msgType,
                        text: msg.msgText
                    };
                    break;
                case "sticker":
                    msg2 = {
                        type: msg.msgType,
                        packageId: msg.stickerPackageID,
                        stickerId: msg.stickerID
                    };
                    proms1.push(
                        svc.addUpdateStickerInfo(msg.stickerPackageID, msg.stickerID, (stickerInfo) => {
                            stickerInfo.outFrequency = stickerInfo.outFrequency || 0;
                            stickerInfo.outFrequency++;
                        })
                            .catch((err) => {
                                svc.emit("error", err);
                                return Promise.resolve(false);
                            })
                    );
                    break;
                default:
                    msg2 = {};
                    break;
            }
            
            msgSetInfo.frequency = msgSetInfo.frequency || 0;
            msgSetInfo.frequency++;
            
            return Promise.all(proms1)
                .then((results) => {
                    return svc.modelsService.updateItem(msgSetInfo.modelKey, msgSetInfo.id, msgSetInfo)
                        .catch((err) => {
                            svc.emit("error", err);
                            return Promise.resolve(false);
                        });
                })
                .then(() => {
                    return Promise.resolve(msg2);
                });
        },
        addUpdateStickerInfo: function(/*provider,*/ pkgID, stickerID, callbackFn) {
            const svc = this;
            const provider = "LINE";
            
            return svc.modelsService.getCollection("chatbot-stickers", { 
                provider: provider,
                stickerPackageID: pkgID,
                stickerID: stickerID
            })
                .then((items) => {
                    stickerInfo = ((items) && (items.length >= 1))
                        ? items[0]
                        : null;
                    let newStickerInfo = false;
                    if (!stickerInfo) {
                        newStickerInfo = true;
                        stickerInfo = {
                            provider: provider,
                            stickerPackageID: pkgID,
                            stickerID: stickerID,
                            notes: "",
                            inFrequency: 0,
                            outFrequency: 0,
                            weight: 0
                        };
                    }
                    (callbackFn) && callbackFn.call(svc, stickerInfo);
                    let itemKey = svc.modelsService.getItemKey(stickerInfo);
                    
                    return (newStickerInfo)
                        ? svc.modelsService.addItem("chatbot-stickers", itemKey, stickerInfo)
                        : svc.modelsService.updateItem("chatbot-stickers", itemKey, stickerInfo);
                });
        },
        
        onError: function(err) {
            let errMsg = (err) ? err.message : null;
            debug(`ERROR: ${errMsg}: ${util.inspect(err)}`);
            console.error(err);
        }
    };
    UCUtils.updateFrom(svcImpl, EventEmitter.prototype);
    EventEmitter.call(svcImpl);
    
    return svcImpl;
};

