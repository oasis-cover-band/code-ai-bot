// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
require('dotenv').config();

import { Telegraf, Markup } from 'telegraf';
import { initializeApp } from "firebase/app";
import { doc, setDoc, getFirestore, collection } from "firebase/firestore"; 

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const firebaseConfig = {

    apiKey: process.env.FIREBASE_API_KEY,
  
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  
    projectId: "ai-overflow",
  
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  
    appId: process.env.FIREBASE_APP_ID,
  
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  
};

const firebase = initializeApp(firebaseConfig);
const db = getFirestore();


// const analytics = getAnalytics(app);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// const buttons = Telegraf.Extra.markup((m) =>
//   m.inlineKeyboard([
//       [ m.callbackButton('Test', 'test') ],
//       [ m.callbackButton('Test 2', 'test2') ]
//   ])
// );

async function callOpenAI(prompt: string) {
    const completion = await openai.createCompletion({
        'model': 'text-davinci-003',
        'prompt': prompt,
        'max_tokens': 500,
        'temperature': 0,
        'top_p': 1,
        'frequency_penalty': 0.5,
        'presence_penalty': 0.0,
        // 'stop': '\n'
      });
      return await completion.data.choices[0].text;
}

bot.command('start', async (ctx) => {
    let questionId = ctx.update.message.message_id;

    if (questionId !== undefined) {
        ctx.deleteMessage(questionId);
    }
        let reply = await ctx.replyWithMarkdownV2(`
            Hi, *${ctx.update.message.from.first_name}*\\!
            
            _I'm an AI bot that can answer all of your programming questions_\\.

            
            Commands:
                */commands* \\- _Display Code AI's commands\\._
                */ask* \\- _Ask Code AI a programming related question\\._
            
            `,
            // Markup.keyboard([
            //     ['🔍 Close'],
            //     ['📢 Ask']
            // ])
            // .oneTime()
            // .resize()
        );
});

bot.command('commands', async (ctx) => {
    ctx.deleteMessage(ctx.update.message.message_id);

    const reply = await ctx.replyWithMarkdownV2(`
    Commands:
                */commands* \\- _Display Code AI's commands\\._
                */ask* \\- _Ask Code AI a programming related question\\._
                */search* \\- _Search AI Overflow for an already answered question\\._
    `);
    
    const replyId = reply.message_id;

    setTimeout(() => {
        ctx.deleteMessage(replyId);
    }, 60000);
});


function recursivelyCheckExitCharacters(text: string): string {
    let indexOfErrorKey = text.indexOf('.');
    if (indexOfErrorKey === -1) {
        return text;
    } else {
        text = text.substr(0, indexOfErrorKey) + ' ' + text.substr(indexOfErrorKey + 1);
        return recursivelyCheckExitCharacters(text);
    }
}

bot.command('ask', async (ctx) => {
    
    let text: string = ctx.update.message.text.substr(5);
    // text = recursivelyCheckExitCharacters(text);

    const reply = await ctx.reply(`
    Thinking...
    `);

    const aiResponse = await callOpenAI(text);

    // Add a new document in collection "cities"
    const dbItem = doc(collection(db, "queries"));
    console.log(dbItem);
    await setDoc(dbItem, {
        id: dbItem.id,
        answer: aiResponse,
        question: text,
        date: new Date().getTime()
    });

    const aiReply =  await ctx.reply(
        aiResponse
    );
    
    setTimeout(() => {
        const replyId: number = reply.message_id;
        const questionId: number = ctx.update.message.message_id;
        const aiReplyId: number = aiReply.message_id;

        if (questionId !== undefined) {
            ctx.deleteMessage(questionId);
        }
        // if (replyId !== undefined) {
        //     ctx.deleteMessage(replyId);
        // }
        // if (aiReplyId !== undefined) {
        //     ctx.deleteMessage(aiReplyId);
        // }

    }, 5000);
});

bot.on('text', async (ctx) => {
    ctx.deleteMessage(ctx.update.message.message_id);

    const reply = await ctx.replyWithMarkdownV2(`
    Use *"/ask"* or *"/search"* _before_ your query or question\\.
    `);
    
    const replyId = reply.message_id;

    setTimeout(() => {
        ctx.deleteMessage(replyId);
    }, 10000);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));