
module.exports = {
    "chatbot-stickers": {
        idField: "id",
        keyField: "id"
    },
    "chatbot-messages": {
        fields: {
            sticker: {
                modelKey: "chatbot-stickers"
            }
        }
    },
    "chatbot-greetings": {
        idField: "id",
        keyField: "id",
        fields: {
            messages: {
                modelKey: "chatbot-messages"
            }
        }
    },
    "chatbot-replies": {
        idField: "id",
        keyField: "id",
        fields: {
            messages: {
                modelKey: "chatbot-messages"
            }
        }
    }
};
