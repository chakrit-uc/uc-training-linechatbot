
/* global Promise */

const debug = require("debug")("NodeChatBot:bot-scripts:mimic");
const util = require("util");

let botScript;
botScript = {
    onGreeting: function(replyToken, evtParams, msgSet, outMsgs) {
        const svc = this;
        return false;
    },
    onReplying: function(replyToken, srcMsg, evtParams, msgSet, replyMsgs) {
        const svc = this;
        
        console.log("Hello, I'm mimic bot!");
        
        let userID = ((evtParams) && (evtParams.source))
            ? evtParams.source.userId
            : null;
        let groupID = ((evtParams) && (evtParams.source))
            ? evtParams.source.groupId
            : null;
            
        debug(`DEBUG: Replying with Message Sets: ${util.inspect(msgSet)}`);
        let replyMsg1 = null;
        (msgSet) && (msgSet.replyMessages) && msgSet.replyMessages.forEach((msgTmpl) => {
            if (!msgTmpl) {
                return false;
            }
            //Currently only supporting texts & stickers
            switch (msgTmpl.type) {
                case "text":
                    if (srcMsg.type === "text") {
                        let replyText = (msgTmpl.text)
                            ? svc.renderTemplate(msgTmpl.text, {
                                original: srcMsg.text
                            })
                            : srcMsg.text;
                        debug(`DEBUG: ${msgTmpl.text} => ${replyText}`);
                        replyMsg1 = {
                            type: msgTmpl.type,
                            text: replyText
                        }
                        replyMsgs.push(replyMsg1);
                    }
                    break;
                case "sticker":
                    if (srcMsg.type === "sticker") {
                        if (msgTmpl.stickerID) {
                            replyMsg1 = {
                                type: msgTmpl.type,
                                packageId: msgTmpl.stickerPackageID || msgTmpl.packageID,
                                stickerId: msgTmpl.stickerID
                            };
                        } else {
                            replyMsg1 = srcMsg;
                        }
                        replyMsgs.push(replyMsg1);
                    }
                    break;
                default:
                    return false;
            }
        });
        if (!replyMsg1) {
            //Currently only supporting texts & stickers
            if ((srcMsg.type === "text") || (srcMsg.type === "sticker")) {
                replyMsg1 = srcMsg;
                replyMsgs.push(replyMsg1);
                debug(`DEBUG: Default mimic reply => ${replyMsg1}`);
            }
        }
        
        return Promise.resolve(!!replyMsg1);
    }
};

module.exports = botScript;
