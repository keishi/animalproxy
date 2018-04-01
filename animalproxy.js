'use strict';

const http = require('http');
const url = require('url');
const path = require('path');
const WebSocket = require('ws');
const express = require('express');
const bodyParser = require('body-parser');
const ActionsSdkApp = require('actions-on-google').ActionsSdkApp;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')))
const server = http.Server(app);
var io = require('socket.io')(server);

const ANIMALS = [
    "cat",
    "bear",
    "blackgoat",
    "whitegoat",
    "fox",
    "ant",
    "elephant",
    "lion",
    "giraffe",
    "hippo",
    "zebra",
    "penguin",
    "flamingo",
    "pelican",
    "iguana",
    "panda",
    "seagull",
    "monkey"
];

let ANIMAL_PATTERNS = [
    ["cat", /(?:ネコ|猫|ねこ)(?:\s*(?:3|３|三|さん))/],
    ["bear", /(?:クマ|熊|くま)(?:\s*(?:3|３|三|さん))/],
    ["blackgoat", /黒(?:ヤギ|山羊|やぎ)(?:\s*(?:3|３|三|さん))/],
    ["whitegoat", /白(?:ヤギ|山羊|やぎ)(?:\s*(?:3|３|三|さん))/],
    ["fox", /(?:キツネ|狐|きつね)(?:\s*(?:3|３|三|さん))/],
    ["ant", /(?:アリ|蟻|あり)(?:\s*(?:3|３|三|さん))/],
    ["elephant", /(?:ゾウ|象|ぞう)(?:\s*(?:3|３|三|さん))/],
    ["lion", /ライオン(?:\s*(?:3|３|三|さん))/],
    ["giraffe", /(?:キリン|麒麟|きりん)(?:\s*(?:3|３|三|さん))/],
    ["hippo", /(?:カバ|かば)(?:\s*(?:3|３|三|さん))/],
    ["zebra", /(?:シマウマ|縞馬|しまうま)(?:\s*(?:3|３|三|さん))/],
    ["penguin", /ペンギン(?:\s*(?:3|３|三|さん))/],
    ["flamingo", /フラミンゴ(?:\s*(?:3|３|三|さん))/],
    ["pelican", /ペリカン(?:\s*(?:3|３|三|さん))/],
    ["iguana", /イグアナ(?:\s*(?:3|３|三|さん))/],
    ["panda", /パンダ(?:\s*(?:3|３|三|さん))/],
    ["seagull", /(?:カモメ|かもめ)の水兵(?:\s*(?:3|３|三|さん))/],
    ["monkey", /(?:おサル|お猿|おさる)(?:\s*(?:3|３|三|さん))/]
];
function detectAnimal(str) {
    for (let item of ANIMAL_PATTERNS) {
        if (item[1].test(str))
            return item[0];
    }
    return "";
}

const LOCALIZED_STRINGS = {
    "cat": "ネコさん",
    "bear": "クマさん",
    "blackgoat": "黒ヤギさん",
    "whitegoat": "白ヤギさん",
    "fox": "キツネさん",
    "ant": "アリさん",
    "elephant": "ゾウさん",
    "lion": "ライオンさん",
    "giraffe": "キリンさん",
    "hippo": "カバさん",
    "zebra": "シマウマさん",
    "penguin": "ペンギンさん",
    "flamingo": "フラミンゴさん",
    "pelican": "ペリカンさん",
    "iguana": "イグアナさん",
    "panda": "パンダさん",
    "seagull": "かもめの水兵さん",
    "monkey": "おさるさん"
};

function localize(str) {
    return LOCALIZED_STRINGS[str];
}

function detectGoodBye(str) {
    return str == "さようなら" || str == "バイバイ" || /(?:失礼（?:致|いた）?しま)/.test(str);
}

function detectQuit(str) {
    return str == "終了する" || str == "強制終了";
}

function getSocketForAnimal(animal) {
    return Object.values(io.of(`/${animal}`).connected)[0]
}

function getAllClients() {
    let clients = [];
    for (let animal of ANIMALS) {
        let socket = getSocketForAnimal(animal);
        clients.push({
            clientId: animal,
            socketId: socket ? socket.id : '',
        });
    }
    return clients;
}

let adminNs = io.of(`/admin`);
adminNs.on('connect', function (socket) {
    socket.emit('fullSync', {
        clients: getAllClients()
    });
    socket.on('forceDisconnectClient', function (data) {
        let socket = getSocketForAnimal(data.clientId);
        if (socket) {
            socket.disconnect(true);
        }
    });
});

for (let animal of ANIMALS) {
    let ns = io.of(`/${animal}`);
    ns.on('connect', function (socket) {
        console.log("connect", animal, Object.keys(ns.connected).length);
        adminNs.emit('clientConnected', {
            clientId: animal,
            socketId: socket.id
        });
        socket.on('disconnect', () => {
            adminNs.emit('clientDisconnected', {
                clientId: animal,
                socketId: "",
                oldSocketId: socket.id
            });
        });
    });
    ns.use((socket, next) => {
        console.log("ns.use Object.keys(ns.connected).length", Object.keys(ns.connected).length);
        if (getSocketForAnimal(animal)) {
            next(new Error('Already connected'));
            return;
        }
        next();
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
    if (detectQuit(input)) {
        sdk.tell({ speech: `アニマルサーチのご利用ありがとうございました`, displayText: `アニマルサーチのご利用ありがとうございました` });
        return;
    }
    if (!state["animal"]) {
        let animal = detectAnimal(input);
        if (animal) {
            console.assert(ANIMALS.indexOf(animal) != -1);
            if (Object.keys(io.of(`/${animal}`).connected).length == 0) {
                sdk.ask({ speech: `${localize(animal)}は不在のようです。誰と話しますか？`, displayText: `${localize(animal)}は不在のようです。誰と話しますか？` }, {
                    animal: ""
                });
                return;
            }
            sdk.ask({
                speech: `もしもし。${localize(animal)}です。何が知りたいですか？`,
                displayText: `もしもし。${localize(animal)}です。何が知りたいですか？`
            }, {
                    animal: animal
                });
            return;

        }
        sdk.ask({ speech: "誰と話しますか？", displayText: "誰と話しますか？" }, {
            animal: ""
        });
        return;
    }
    let animal = state["animal"];
    if (detectGoodBye(input)) {
        sdk.ask({ speech: `またねー。${localize(animal)}との通話が終了しました。次は誰と話しますか？`, displayText: `またねー。${localize(animal)}との通話が終了しました。次は誰と話しますか？` }, {
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
        socket.emit('action', {
            query: input
        }, (data) => {
            if (data.startsWith('https://')) {
                console.log("media response");
                const mediaResponse = sdk.buildMediaResponse();
                mediaResponse.addMediaObjects([
                    sdk.buildMediaObject("Test MP3", data)
                ]);
                const richResponse =
                    sdk.buildRichResponse()
                        .addSimpleResponse('ん！')
                        .addMediaResponse(mediaResponse)
                        .addSuggestions(["前の回を聞く"]);
                sdk.ask(richResponse, state);
            } else if (data.indexOf('<speak>') >= 0) {
              console.log("ssml");
              const inputPrompt = sdk.buildInputPrompt(true, data);
              sdk.ask(inputPrompt, state);
            } else {
              sdk.ask({ speech: data, displayText: data }, state);
            }
        });
    });
}

function mediaStatusIntent(sdk) {
    let state = sdk.getDialogState();
    const status = sdk.getMediaStatus();
    console.log(`media status: ${status}`, state);
    sdk.ask('で？', state);
}

function cancelIntent(sdk) {
      sdk.tell('終了します。');
}

app.post('/', function (request, response, next) {
    console.log(JSON.stringify(request.body));
    let sdk = new ActionsSdkApp({ request, response });
    let actionMap = new Map();
    actionMap.set(sdk.StandardIntents.MAIN, mainIntent);
    actionMap.set(sdk.StandardIntents.TEXT, rawInput);
    actionMap.set(sdk.StandardIntents.MEDIA_STATUS, mediaStatusIntent);
    actionMap.set(sdk.StandardIntents.CANCEL, cancelIntent);

    sdk.handleRequestAsync(actionMap);
});

server.listen(8080, () => console.log('Listening on port 8080!'));
