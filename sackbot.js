'use strict';

///////////// Requires

require('babel-polyfill');

const Botkit = require('botkit');
const express = require('express');
const schedule = require('node-schedule');
const promisify = require('promisify-node');

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

controller.on('message_received', (bot, message) => {
    bot.reply(message, 'I am listening...')
});
