
const apiURLPrefix = "https://api.line.me/v2/";

module.exports = function (opts) {
    let opts2 = opts || {};
    
    let channelID = opts2.channelID;
    let channelSecret = opts2.channelSecret;
    let channelToken = opts2.channelToken;
    
    return {
        verifyLineSignature: function(sig, evtParams) {
            if (!sig) {
                throw new Error("No signature received");
            }
            //TODO:
            return true;
        },
        onIncomingMessage: function(msg, evtParams) {
            let status = "ok";
            
            if (!msg) {
                return status;
            }
            
            let replyToken = (evtParams) ? evtParams.replyToken : null;
            
            switch (msg.type) {
                case "text":
                    let msgText = msg.text;
                    console.log(`Got msg#${msg.id}: ${msgText}`);
                    let replyMsg = {
                        type: "text",
                        text: `Thanks for ${msgText}!`
                    };
                    this.replyToMessage(replyToken, replyMsg, evtParams);
                    break;
                default:
                    break;
            }
            
            return status;
        },
        
        replyToMessage: function(replyToken, replyMsg, evtParams) {
            console.log(`Sending Reply Msg#${replyToken}: ${replyMsg}`);
            //TODO:
        }
    };
};
