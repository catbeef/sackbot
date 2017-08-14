'use strict';

///////////// Requires

require('babel-polyfill');

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const schedule = require('node-schedule');
const promisify = require('promisify-node');

const Botkit = require('botkit');
const MarkovChain = require('markovchain')

mongoose.Promise = Promise;

///////////// Mongoose

mongoose.connect(process.env.MONGO_CONNECTION_STRING);

const messageSchema = mongoose.Schema({
    text: String
});

const Message = mongoose.model('Message', messageSchema);

///////////// Botpoop

class PromiseBot {
    constructor(bot) {
        this.bot = bot;
    }

    get api() {
        return {
            channels: {
                list: promisify(this.bot.api.channels.list)
            },
            chat: {
                postMessage: promisify(this.bot.api.chat.postMessage)
            },
            im: {
                list: promisify(this.bot.api.im.list)
            },
            users: {
                info: promisify(this.bot.api.users.info),
                list: promisify(this.bot.api.users.list)
            }
        }
    }

    reply(message, text) {
        this.bot.reply(message, text);
    }
}

const controller = Botkit.slackbot({
    debug: false
});

const bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

const promiseBot = new PromiseBot(bot);

////////////// Markov chain setup stuff

const getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const markovChain = new MarkovChain();

mongoose.connection.once('open', () => {
    const stream = Message.find().cursor();
    stream.on('data', (doc) => {
        markovChain.parse(doc.text);
    });
});
 
////////////// Controller stuff

const recordMessage = async (text) => {
    markovChain.parse(text);  

    const message = new Message({ text });

    return message.save();
};

const getResponse = (text) => {
    const words = text.split(/\s+/);
    const lastWord = words[ words.length - 1 ];

    const wordCount = getRandomIntInclusive(5, 30);

    const talkAboutMyself = Math.random() < 0.05;
    if (talkAboutMyself) {
        return markovChain.start('i').end(wordCount).process();
    }

    let response = markovChain.start(lastWord).end(wordCount).process();

    if (response === lastWord) {
        response = markovChain.start('i').end(wordCount).process();
    }

    return response;
};

controller.hears(
    ['.*'],
    ['direct_message,direct_mention,mention'],
    async (bot, message) => {
        await recordMessage(message.text);
        bot.reply(message, getResponse(message.text));
    }
)

controller.hears(
    ['.*'],
    'ambient',
    async (bot, message) => {
        await recordMessage(message.text);

        if (Math.random() < 0.01) {
            bot.reply(message, getResponse(message.text));
        }
    }
)

///////////// App setup

const app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
    res.send('Poop');
});

///////////// /confess

let confessionsChannelId;

async function getConfessionsChannelId() {
    if (confessionsChannelId == undefined) {
        const resp = await promiseBot.api.channels.list({});

        const confessionsChannel = resp.channels.find(channel => channel.name == 'confessions');
        if (!confessionsChannel) {
            throw "I can't work without a confessions channel!";
        }

        console.log("Found the confessions channel!");
        console.log(confessionsChannel);

        confessionsChannelId = confessionsChannel.id
    }

    return confessionsChannelId;
}

app.post('/confess', async function(req, res) {
    try {
        const confessionsId = await getConfessionsChannelId();

        promiseBot.api.chat.postMessage(
            {
                as_user: true,
                channel: confessionsId,
                link_names: 1,
                text: `I confess: ${ req.body.text }`
            },
        );

        res.send('it is confessed. poop ass balls. toodles -mkoryak');
    } catch (err) {
        res.status(500).send('Something fucked up');

        throw err;
    }
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'));
});