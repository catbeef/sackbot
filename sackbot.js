'use strict';

///////////// Requires

require('babel-polyfill');

const express = require('express');
const schedule = require('node-schedule');
const promisify = require('promisify-node');

const Botkit = require('botkit');
const MarkovChain = require('markovchain')

///////////// App setup

const app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.send('Poop');
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'));
});

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

const getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const markovChain = new MarkovChain('poop\nass\nballs');
 
////////////// Controller stuff

const getResponse = (text) => {
    const words = text.split(/\s+/);

    const wordCount = getRandomIntInclusive(5, 30);

    return words[0].length > 0
        ? markovChain.start(words[0]).end(wordCount).process()
        : markovChain.start().end(wordCount).process();
};

controller.hears(
    ['.*'],
    ['direct_message,direct_mention,mention'],
    (bot, message) => {
        markovChain.parse(message.text);  
        bot.reply(message, getResponse(message.text));
    }
)

controller.hears(
    ['.*'],
    'ambient',
    (bot, message) => {
        markovChain.parse(message.text);

        if (Math.random() < 0.01) {
            bot.reply(message, getResponse(message.text));
        }
    }
)