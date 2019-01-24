
module.exports = {
    "chatbot-stickers": {
        idField: "id",
        keyField: "id"
    },
    "chatbot-messages": {
        idField: "id",
        keyField: "id",
        fields: {
            sticker: {
                isRef: true,
                modelKey: "chatbot-stickers"
            }
        }
    },
    "chatbot-greetings": {
        idField: "id",
        keyField: "id",
        fields: {
            messages: {
                isRef: true,
                modelKey: "chatbot-messages"
            }
        }
    },
    "chatbot-replies": {
        idField: "id",
        keyField: "id",
        fields: {
            messages: {
                isRef: true,
                modelKey: "chatbot-messages"
            }
        }
    }
};
