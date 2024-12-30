const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://zerox-7aa11-default-rtdb.firebaseio.com',
});

const db = admin.firestore();
const bot = new Telegraf('7545296655:AAGcSBWfDuLOsLmi7aJ-bP9UvZnvaFIKTd8');

// Required Channels
const requiredChannels = ['@allAirdrop_Community', '@New_Ardrops', '@Airdrops_Assistants'];

// Start Command Handler
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'User';

  // Check if user already exists in Firestore
  const userRef = db.collection('botusers').doc(userId.toString());
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    // Prompt user to join channels
    const message = `Welcome, ${userName}! 🎉\n\nTo continue, please join the following channels:\n\n${requiredChannels
      .map((channel) => `${channel}`)
      .join('\n')}\n\nAfter joining, click "Continue" below.`;

    await ctx.reply(message, Markup.inlineKeyboard([Markup.button.callback('Continue', 'check_membership')]));
  } else {
    await ctx.reply('You are already registered. Enjoy your rewards! 🎁', Markup.inlineKeyboard([Markup.button.callback('Home', 'home')]));
  }
});

// Check Membership Handler
bot.action('check_membership', async (ctx) => {
    const userId = ctx.from.id;
  
    try {
      let allJoined = true;
      const notJoinedChannels = [];
  
      // Check if the user has joined all required channels
      for (const channel of requiredChannels) {
        try {
          const chatMember = await ctx.telegram.getChatMember(channel, userId);
  
          if (
            chatMember.status !== 'member' &&
            chatMember.status !== 'administrator' &&
            chatMember.status !== 'creator'
          ) {
            allJoined = false;
            notJoinedChannels.push(channel);
          }
        } catch (error) {
          allJoined = false;
          notJoinedChannels.push(channel); // Assume not joined if API fails
        }
      }
  
      if (allJoined) {
        const userRef = db.collection('botusers').doc(userId.toString());
        const userDoc = await userRef.get();
  
        if (!userDoc.exists) {
          // Register the new user
          const balance = 100;
          await userRef.set({
            id: userId,
            name: ctx.from.first_name,
            username: ctx.from.username || null,
            refers: 0,
            balance: balance,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
  
          // Handle referral logic
          const referrerId = ctx.startPayload; // Extract referrer ID from /start command
          if (referrerId) {
            const referrerRef = db.collection('botusers').doc(referrerId);
            const referrerDoc = await referrerRef.get();
  
            if (referrerDoc.exists) {
              const referrerData = referrerDoc.data();
  
              // Update referrer's balance and referral count
              await referrerRef.update({
                balance: referrerData.balance + 20,
                refers: referrerData.refers + 1,
              });
  
              // Notify referrer about successful referral
              const referrerMessage = `🎉 Congratulations! You earned 20 Dogs for referring ${ctx.from.first_name}. Your new balance is ${referrerData.balance + 20} Dogs.`;
              await bot.telegram.sendMessage(referrerId, referrerMessage);
            }
          }
  
          // Send success message
          const balanceMessage = `🎉 Congratulations, ${ctx.from.first_name}! You've earned ${balance} Dogs! 🐶\n\nHere is your referral link to invite friends and earn 20 Dogs per referral:\nhttps://t.me/NYDogs_bot?start=${userId}`;
          await ctx.editMessageText(balanceMessage, Markup.inlineKeyboard([
            [Markup.button.callback('Balance: ' + balance + ' Dogs', 'check_balance')],
            [Markup.button.callback('Refers: 0', 'check_refers')],
            [Markup.button.callback('Withdraw', 'withdraw')],
            [Markup.button.callback('Leaderboard', 'leaderboard')]
          ]));
        } else {
          // User is already registered
          await ctx.editMessageText('You are already registered.', Markup.inlineKeyboard([Markup.button.callback('Home', 'home')]));
        }
      } else {
        // Notify user of channels they haven't joined
        await ctx.editMessageText(
          `❌ You have not joined the following channels:\n\n${notJoinedChannels
            .map((channel) => `${channel}`)
            .join('\n')}\n\nPlease join these channels to continue.`,
          Markup.inlineKeyboard([Markup.button.callback('Continue', 'check_membership')])
        );
      }
    } catch (error) {
      console.error('Error in check_membership:', error);
      await ctx.reply('An error occurred. Please try again later.');
    }
  });
  

// Balance Button Handler
bot.action('check_balance', async (ctx) => {

    try {
        let allJoined = true;
        const notJoinedChannels = [];
    
        for (const channel of requiredChannels) {
          try {
            const chatMember = await ctx.telegram.getChatMember(channel, userId);
    
            if (
              chatMember.status !== 'member' &&
              chatMember.status !== 'administrator' &&
              chatMember.status !== 'creator'
            ) {
              allJoined = false;
              notJoinedChannels.push(channel);
            }
          } catch (error) {
            allJoined = false;
            notJoinedChannels.push(channel); // Assume not joined if API fails
          }
        }
    
        if (allJoined) {
            const userId = ctx.from.id;
            const userRef = db.collection('botusers').doc(userId.toString());
            const userDoc = await userRef.get();
          
            if (userDoc.exists) {
              const userData = userDoc.data();
              const balanceMessage = `💰 Your current balance is: ${userData.balance} Dogs 🐶\n\nHere is your referral link to increase your balance: https://t.me/NYDogs_bot?start=${userId}`;
              await ctx.editMessageText(balanceMessage, Markup.inlineKeyboard([Markup.button.callback('Home', 'home')]));
            }
        } else {
          // Notify user of the channels they haven't joined
          await ctx.editMessageText(
            `❌ You have leaved the following channels:\n\n${notJoinedChannels
              .map((channel) => `${channel}`)
              .join('\n')}\n\nPlease join these channels to continue.`,
            Markup.inlineKeyboard([Markup.button.callback('Continue', 'home')])
          );
        }
      } catch (error) {
      }
});

// Refers Button Handler
bot.action('check_refers', async (ctx) => {
    try {
        let allJoined = true;
        const notJoinedChannels = [];
    
        for (const channel of requiredChannels) {
          try {
            const chatMember = await ctx.telegram.getChatMember(channel, userId);
    
            if (
              chatMember.status !== 'member' &&
              chatMember.status !== 'administrator' &&
              chatMember.status !== 'creator'
            ) {
              allJoined = false;
              notJoinedChannels.push(channel);
            }
          } catch (error) {
          }
        }
    
        if (allJoined) {
            const userId = ctx.from.id;
            const userRef = db.collection('botusers').doc(userId.toString());
            const userDoc = await userRef.get();
          
            if (userDoc.exists) {
              const userData = userDoc.data();
              const refersMessage = `👥 Your current referrals: ${userData.refers}\n\nShare your link to get more referrals: https://t.me/NYDogs_bot?start=${userId}`;
              await ctx.editMessageText(refersMessage, Markup.inlineKeyboard([Markup.button.callback('Home', 'home')]));
            }
        } else {
          // Notify user of the channels they haven't joined
          await ctx.editMessageText(
            `❌ You have leaved the following channels:\n\n${notJoinedChannels
              .map((channel) => `${channel}`)
              .join('\n')}\n\nPlease join these channels to continue.`,
            Markup.inlineKeyboard([Markup.button.callback('Continue', 'home')])
          );
        }
      } catch (error) {
      }
});

// Withdraw Button Handler
bot.action('withdraw', async (ctx) => {
    try {
      const userId = ctx.from.id;
  
      // Check if the user has joined all required channels
      let allJoined = true;
      const notJoinedChannels = [];
  
      for (const channel of requiredChannels) {
        try {
          const chatMember = await ctx.telegram.getChatMember(channel, userId);
  
          if (
            chatMember.status !== 'member' &&
            chatMember.status !== 'administrator' &&
            chatMember.status !== 'creator'
          ) {
            allJoined = false;
            notJoinedChannels.push(channel);
          }
        } catch (error) {
        }
      }
  
      if (!allJoined) {
        await ctx.editMessageText(
          `❌ You have not joined the following channels:\n\n${notJoinedChannels
            .map((channel) => `${channel}`)
            .join('\n')}\n\nPlease join these channels to continue.`,
          Markup.inlineKeyboard([Markup.button.callback('Continue', 'home')])
        );
        return;
      }
  
      // Fetch user data
      const userRef = db.collection('botusers').doc(userId.toString());
      const userDoc = await userRef.get();
  
      if (!userDoc.exists || userDoc.data().balance < 500) {
        await ctx.editMessageText(
          '❗ Minimum withdrawal amount is 500 Dogs.',
          Markup.inlineKeyboard([Markup.button.callback('Home', 'home')])
        );
        return;
      }
  
      // Start withdrawal process
      ctx.session.withdrawal = { step: 1 }; // Initialize withdrawal state
      await ctx.editMessageText(
        'Please enter your withdrawal address. Make sure to double-check it before submitting.',
        Markup.inlineKeyboard([Markup.button.callback('Back', 'home')])
      );
    } catch (error) {
    }
  });
  
  // Handle withdrawal inputs
  bot.on('text', async (ctx) => {
    try {
      if (!ctx.session.withdrawal) return; // Ignore unrelated messages
  
      const { step } = ctx.session.withdrawal;
  
      if (step === 1) {
        ctx.session.withdrawal.address = ctx.message.text;
        ctx.session.withdrawal.step = 2;
        await ctx.reply(
          'Enter the memo (default is NULL if not required).',
          Markup.inlineKeyboard([Markup.button.callback('Back', 'home')])
        );
      } else if (step === 2) {
        ctx.session.withdrawal.memo = ctx.message.text || 'NULL';
        ctx.session.withdrawal.step = 3;
        await ctx.reply(
          'Enter the amount to withdraw:',
          Markup.inlineKeyboard([Markup.button.callback('Back', 'home')])
        );
      } else if (step === 3) {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
          await ctx.reply('Invalid amount. Please enter a valid number.');
          return;
        }
  
        ctx.session.withdrawal.amount = amount;
  
        const { address, memo } = ctx.session.withdrawal;
        await ctx.reply(
          `Withdrawal request received:\nAddress: ${address}\nMemo: ${memo}\nAmount: ${amount} Dogs\nConfirm this withdrawal?`,
          Markup.inlineKeyboard([
            [Markup.button.callback('Confirm', 'confirm_withdraw')],
            [Markup.button.callback('Cancel', 'home')]
          ])
        );
  
        // Clear session after finishing
        ctx.session.withdrawal = null;
      }
    } catch (error) {
    }
  });

// Confirm Withdraw Handler
bot.action('confirm_withdraw', async (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('botusers').doc(userId.toString());
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const userData = userDoc.data();
    await db.collection('Withdrawls').doc(userId.toString()).set({
        address: userData.address,
        memo: userData.memo,
        amount: userData.balance,
        status: 'confirmed'
      });
    await ctx.editMessageText('✅ Withdrawal confirmed! Your request is being processed.', Markup.inlineKeyboard([Markup.button.callback('Home', 'home')]));
  }
});

// Home Button Handler
bot.action('home', async (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('botusers').doc(userId.toString());
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const userData = userDoc.data();
    const homeMessage = `🎉 Welcome back, ${userData.name}! Your current balance is $${userData.balance} Dogs.`;
    await ctx.editMessageText(homeMessage, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Balance:' + `${userData.balance}` + 'Dogs', 'check_balance')],
        [Markup.button.callback('Refers' + `${userData.refers}`, 'check_refers')],
        [Markup.button.callback('Withdraw', 'withdraw')]
      ])
    });
  }
});

// Launch Bot
bot.launch();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));