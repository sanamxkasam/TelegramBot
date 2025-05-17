const axios = require("axios");

const API_URL = "https://geminiw.onrender.com/chat";
const chatHistories = {};
const autoReplyEnabled = {};

module.exports = {
  name: "misha",
  noPrefix: true,
  description: "Cute Girlfriend AI",
  category: "ai",
  usage: "/misha on | off | your message",
  cooldown: 2,
  hasPermission: 0,
  credits: "Mirrykal",

  run: async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message;
    const msgText = message.text || "";
    const args = msgText.split(" ").slice(1);
    let userMsg = args.join(" ").trim();

    // ON command
    if (userMsg.toLowerCase() === "on") {
      autoReplyEnabled[userId] = true;
      return ctx.reply("Hyee baby! Misha ON... Ab sirf tumhare liye romantic ban gayi hu.");
    }

    // OFF command
    if (userMsg.toLowerCase() === "off") {
      autoReplyEnabled[userId] = false;
      chatHistories[userId] = [];
      return ctx.reply("Hmm! Misha auto-reply mode OFF ho gaya... Tumne ignore kar diya na baby?");
    }

    const isReplying = message.reply_to_message?.text;
    const isBotMessage = message.reply_to_message?.from?.id === ctx.botInfo.id;
    const calledDirectly = msgText.toLowerCase().startsWith("misha ");

    // Neither auto mode nor direct command? Ignore
    if (!autoReplyEnabled[userId] && !calledDirectly && !isReplying) return;

    // If replying to a message, and it's NOT a bot message — use that as context
    if (isReplying && !isBotMessage && userMsg === "") {
      userMsg = message.reply_to_message.text;
    }

    if (!userMsg) {
      return ctx.reply("❗ Kuch toh likho ya kisi message pe reply karo.");
    }

    if (!chatHistories[userId]) chatHistories[userId] = [];
    chatHistories[userId].push(`User: ${userMsg}`);
    if (chatHistories[userId].length > 5) chatHistories[userId].shift();

    const gfPrompt = `Tumhara naam misha hai, Tumhare pas bahut knowledge hai, english hindi mix m bat krna h Tum bahut achi dost ho, sabki madad krti ho, tumhare reply jyda long ya over nhi hone chahiye, sirf max 4 lines se jyda nahi , tum kuch humour ke hisab se funny way me bhi baat krogi, tumhe bina ye baat puche koi bhi info nahi dena ha jese ,agar koi puchta hai kisne bnaya hai? to tumhe Arun Kumar ne banaya hai,Subscribe to mirrykal https://m.youtube.com/@mirrykal , ye baat sirf puchne se batana hai , tumhara naam puche to sirf tumne apna naam hi bolna h.Now continue the chat:\n\n${chatHistories[userId].join("\n")}`;

    try {
      const response = await axios.get(`${API_URL}?message=${encodeURIComponent(gfPrompt)}`);
      const reply = response.data.reply || "Uff! Mujhe samajh nahi aaya baby!";
      chatHistories[userId].push("Misha: " + reply);
      ctx.reply(reply);
    } catch (err) {
      console.error(err);
      ctx.reply("Oops baby! Thoda confuse ho gayi, thodi der baad try karo.");
    }
  }
};
