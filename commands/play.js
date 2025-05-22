const fs = require("fs");
const path = require("path");
const https = require("https");
const ytSearch = require("yt-search");
const { youtube } = require("btch-downloader");
const axios = require("axios");

// Cache folder setup
const downloadDir = path.join(__dirname, "../cache");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

// Auto-delete file after timeout
function deleteAfterTimeout(filePath, timeout = 5000) {
  setTimeout(() => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("File delete error:", err.message);
      });
    }
  }, timeout);
}

module.exports = {
  name: "music",
  description: "Play top YouTube song",
  category: "media",
  usage: "/music song name",
  cooldown: 5,
  hasPermission: 0,
  credits: "Mirrykal",

  run: async (ctx) => {
    const msgText = ctx.message.text || "";
    const args = msgText.split(" ").slice(1);
    const songName = args.join(" ");

    if (!songName) return ctx.reply("Gaane ka naam likho yaar!");

    try {
      const searchResults = await ytSearch(songName);
      const topVideo = searchResults.videos[0];
      if (!topVideo) return ctx.reply("Kuch nahi mila! Gaane ka naam sahi likho.");

      // Thumbnail download
      const thumbnailUrl = topVideo.thumbnail;
      const thumbPath = path.join(downloadDir, `thumb_${Date.now()}.jpg`);
      const thumbWriter = fs.createWriteStream(thumbPath);

      const thumbRes = await axios({ url: thumbnailUrl, responseType: "stream" });
      thumbRes.data.pipe(thumbWriter);
      await new Promise((resolve, reject) => {
        thumbWriter.on("finish", resolve);
        thumbWriter.on("error", reject);
      });

      await ctx.replyWithPhoto(
        { source: fs.createReadStream(thumbPath) },
        {
          caption: `🎵 *${topVideo.title}*\n🔗 https://www.youtube.com/watch?v=${topVideo.videoId}`,
          parse_mode: "Markdown",
        }
      );

      deleteAfterTimeout(thumbPath);

      // Use btch-downloader for audio
      const ytInfo = await youtube(`https://www.youtube.com/watch?v=${topVideo.videoId}`);
      let audioUrl = null;
      if (ytInfo.audio?.url) audioUrl = ytInfo.audio.url;
      else if (Array.isArray(ytInfo.url)) audioUrl = ytInfo.url[0];
      else if (typeof ytInfo.url === "string") audioUrl = ytInfo.url;
      else if (ytInfo.formats?.[0]?.url) audioUrl = ytInfo.formats[0].url;

      if (!audioUrl) throw new Error("Audio URL not found from btch-downloader.");

      const safeTitle = topVideo.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
      const filename = `${safeTitle}.mp3`;
      const audioPath = path.join(downloadDir, filename);

      // Download audio
      const audioWriter = fs.createWriteStream(audioPath);
      await new Promise((resolve, reject) => {
        https.get(audioUrl, (res) => {
          if (res.statusCode === 200) {
            res.pipe(audioWriter);
            audioWriter.on("finish", () => audioWriter.close(resolve));
          } else {
            reject(new Error(`Audio download failed. Status: ${res.statusCode}`));
          }
        }).on("error", reject);
      });

      await ctx.replyWithAudio({ source: fs.createReadStream(audioPath), filename });
      deleteAfterTimeout(audioPath);

    } catch (err) {
      console.error("Error:", err.message);
      ctx.reply("Kuch gadbad ho gayi. Thoda baad try karo.");
    }
  }
};
