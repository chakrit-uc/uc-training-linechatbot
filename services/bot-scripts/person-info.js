
/* global Promise */

const debug = require("debug")("NodeChatBot:bot-scripts:person-info");
const util = require("util");
const UCUtils = require("../../lib/uc-utils-node");

let botScript;
botScript = {
    onGreeting: function(replyToken, evtParams, msgSet, outMsgs) {
        const svc = this;
        return false;
    },
    onReplying: function(replyToken, srcMsg, evtParams, msgSet, replyMsgs) {
        const svc = this;
        
        console.log("Hello, I'm person-info bot!");
        
        let userID = ((evtParams) && (evtParams.source))
            ? evtParams.source.userId
            : null;
        let groupID = ((evtParams) && (evtParams.source))
            ? evtParams.source.groupId
            : null;
            
        debug(`DEBUG: Replying with Message Sets: ${util.inspect(msgSet)}`);
        let data = {
            original: srcMsg.text,
            user: evtParams.userProfile,
            group: evtParams.groupInfo
        };
        if ((msgSet.msgPattern) && (srcMsg.text)) {
            let regex = new RegExp(msgSet.msgPattern);
            data.matches = regex.exec(srcMsg.text);
        }
        let cmdParts = (srcMsg.text) ? srcMsg.text.split(/\s+/) : null;
        let cmd;
        let params;
        if ((cmdParts) && (cmdParts.length >= 1)) {
            cmd = cmdParts[0];
            params = cmdParts.slice(1);
        }
        let personInfo;
        data.name = ((params) && (params.length >= 1)) ? params[0] : null;
        
        let replyTextPattern;
        let prom1;
        if (data.name) {
            prom1 = svc.modelsService.getCollection('chatbot-persons', {
                //TODO:
                name: data.name
            })
                .then((persons) => {
                    personInfo = ((persons) && (persons.length >= 1))
                      ? persons[0]
                      : null;
                    if (!personInfo) {
                        replyTextPattern = /\$\{error:not-found\}/;
                        //data["error:not-found"] = "";
                    }
                    
                    return Promise.resolve(personInfo);
                });
        } else {
            replyTextPattern = /\$\{error:missing-args\}/;
            prom1 = Promise.resolve(null);
        } 
            
        return prom1
            .then(() => {
                data.person = personInfo || {};
                if (personInfo) {
                    //data.person.firstName = personInfo.firstName;
                    //data.person.lastName = personInfo.lastName;
                    switch (cmd) {
                        case "fb":
                            //data.personInfo.facebookURL = personInfo.facebookURL;
                            replyTextPattern = /\$\{person.facebookURL\}/;
                            break;
                        case "image":
                            //data.imageURL = personInfo.imageURL;
                            replyTextPattern = /\$\{person.imageURL\}/;
                            break;
                        case "age":
                            //data.age = personInfo.age;
                            replyTextPattern = /\$\{person.age\}/;
                            break;
                        default:
                            break;
                    }
                } else {
                    //return Promise.reject(new Error("Person info not found"));
                }

                let replyMsg1 = null;
                (msgSet) && (msgSet.replyMessages) && msgSet.replyMessages.forEach((msgTmpl) => {
                    if (!msgTmpl) {
                        return false;
                    }
                    /*
                    if (replyMsg1) {
                        return false;
                    }
                    */
                    //Currently only supporting texts & stickers
                    switch (msgTmpl.type) {
                        case "text":
                            if (srcMsg.type === "text") {
                                if ((replyTextPattern) && (replyTextPattern.test(msgTmpl.text))) {
                                    let replyText = svc.renderTemplate(msgTmpl.text, data);
                                    debug(`DEBUG: Template: ${msgTmpl.text}; Data: ${util.inspect(data)} => ${replyText}`);
                                    replyMsg1 = {
                                        type: msgTmpl.type,
                                        text: replyText
                                    };
                                    replyMsgs.push(replyMsg1);
                                }
                            }
                            break;
                        case "sticker":
                            replyMsg1 = {
                                type: msgTmpl.type,
                                packageId: (msgTmpl.sticker)
                                    ? msgTmpl.sticker.packageID 
                                    : msgTmpl.stickerPackageID  || msgTmpl.packageID,
                                stickerId:  (msgTmpl.sticker)
                                    ? msgTmpl.sticker.stickerID
                                    : msgTmpl.stickerID
                            };
                            if ((!replyMsg1.stickerID) && (srcMsg.type === "sticker")) {
                                replyMsg1 = srcMsg;
                            }
                            replyMsgs.push(replyMsg1);
                            break;
                        default:
                            return false;
                    }
                });
                if (!replyMsg1) {
                    replyMsg1 = {
                        type: "text"
                    };
                    let lines = [];
                    for (let key in data.person) {
                        if (!data.person.hasOwnProperty(key)) {
                            continue;
                        }
                        lines.push(`${key}: ${data.person[key]}`);
                    }
                    replyMsg1.text = lines.join("\n");
                    replyMsgs.push(replyMsg1);
                    debug(`WARN: No reply messages for person-info bot configured in message set: ${util.inspect(msgSet)}`);
                }

                return Promise.resolve(!!replyMsg1);
            });
    }
};

module.exports = botScript;
