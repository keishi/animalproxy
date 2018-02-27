'use strict';

const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const express = require('express');
const bodyParser = require('body-parser');
const ActionsSdkApp = require('actions-on-google').ActionsSdkApp;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const server = http.createServer(app);
var io = require('socket.io')(server);

const ANIMALS = [
    "elephant",
    "lion",
    "giraffe",
    "hippo",
    "zebra",
    "penguin",
    "flamingo",
    "pelican",
    "panda",
    "ostrich"
];

let ANIMAL_PATTERNS = [
    ["elephant", /(?:ゾウ|象|ぞう)さん/],
    ["lion", /ライオンさん/],
    ["giraffe", /(?:キリン|麒麟|きりん)さん/],
    ["hippo", /(?:カバ|かば)さん/],
    ["zebra", /(?:シマウマ|縞馬|しまうま)さん/],
    ["penguin", /ペンギンさん/],
    ["flamingo", /フラミンゴさん/],
    ["pelican", /ペリカンさん/],
    ["panda", /パンダさん/],
    ["ostrich", /(?:ダチョウ|だちょう)さん/],
];
function detectAnimal(str) {
    for (let item of ANIMAL_PATTERNS) {
        if (item[1].test(str))
            return item[0];
    }
    return "";
}

const LOCALIZED_STRINGS = {
    "elephant": "ゾウさん",
    "lion": "ライオンさん",
    "giraffe": "キリンさん",
    "hippo": "カバさん",
    "zebra": "シマウマさん",
    "penguin": "ペンギンさん",
    "flamingo": "フラミンゴさん",
    "pelican": "ペリカンさん",
    "panda": "パンダさん",
    "ostrich": "ダチョウさん"
};

function localize(str) {
    return LOCALIZED_STRINGS[str];
}

function detectGoodBye(str) {
    return /失礼（?:致|いた）?しま/.test(str);
}

const connected = {};

for (let animal of ANIMALS) {
    let ns = io.of(`/${animal}`);
    ns.on('connection', function (socket) {
        if (Object.keys(ns.connected).length) {
            socket.emit('error', {
                message: 'Animal is already connected'
            });
        }
    });
}

app.get('/', (req, res) => res.send('Welcome to AnimalProxy!'));


function mainIntent(sdk) {
    console.log('New Conversation: ', JSON.stringify({
        conversationId: sdk.getConversationId(),
        userId: sdk.body_.user.userId
    }));
    sdk.ask({ speech: "誰と話しますか？", displayText: "誰と話しますか？" }, {
        target: ""
    });
}

function rawInput(sdk) {
    let state = sdk.getDialogState();
    let input = sdk.getRawInput();
    if (!state["animal"]) {
        let animal = detectAnimal(input);
        if (animal) {
            if (Object.keys(io.of(`/${animal}`).connected).length > 0) {
                sdk.ask({
                    speech: `もしもし。${localize(animal)}です。何が知りたいですか？`,
                    displayText: `もしもし。${localize(animal)}です。何が知りたいですか？`
                }, {
                    animal: animal
                });
                return;
            }
            sdk.tell(`${localize(animal)}は不在のようです。`);
        }
        sdk.ask({ speech: "誰と話しますか？", displayText: "誰と話しますか？" }, {
            animal: ""
        });
        return;
    }
    if (detectGoodBye(input)) {
        sdk.ask({ speech: "またねー", displayText: "またねー" }, {
            animal: ""
        });
        return;
    }
    return new Promise((resolve, reject) => {
        let socket = Object.values(io.of(`/${animal}`).connected)[0];
        if (!socket) {
            sdk.ask({ speech: "あれ？${localize(animal)}は不在のようです。誰と話しますか？", displayText: "あれ？${localize(animal)}は不在のようです。誰と話しますか？" }, {
                animal: ""
            });
            reject();
            return;
        }
        socket.emit('search', {
            query: input
        }, (data) => {
            sdk.ask({ speech: data, displayText: data }, state);
        });
    });
}

app.post('/', function (request, response, next) {
    console.log(JSON.stringify(request.body));
    let sdk = new ActionsSdkApp({ request, response });

    let actionMap = new Map();
    actionMap.set(sdk.StandardIntents.MAIN, mainIntent);
    actionMap.set(sdk.StandardIntents.TEXT, rawInput);

    sdk.handleRequestAsync(actionMap);
});

app.listen(8080, () => console.log('Listening on port 8080!'))
