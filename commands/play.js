const fs = require("fs");
const path = require("path");
const https = require("https");
const ytSearch = require("yt-search");
const { youtube } = require("btch-downloader");
const axios = require("axios");

// Cache folder
const downloadDir = path.join(__dirname, "../cache");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

// Auto-delete file
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
  name: "video",
  description: "Play YouTube video",
  category: "media",
  usage: "/video song name",
  cooldown: 5,
  hasPermission: 0,
  credits: "Mirrykal",

  run: async (ctx) => {
    const msgText = ctx.message.text || "";
    const args = msgText.split(" ").slice(1);
    const songName = args.join(" ");

    if (!songName) return ctx.reply("Gaane ya video ka naam likho!");

    try {
      const searchResults = await ytSearch(songName);
      const topVideo = searchResults.videos[0];
      if (!topVideo) return ctx.reply("Kuch nahi mila! Naam check karo.");

      // Download thumbnail
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
          caption: `🎬 *${topVideo.title}*\n🔗 https://www.youtube.com/watch?v=${topVideo.videoId}`,
          parse_mode: "Markdown",
        }
      );

      deleteAfterTimeout(thumbPath);

      // btch-downloader for video URL
      const ytInfo = await youtube(`https://www.youtube.com/watch?v=${topVideo.videoId}`);
      let videoUrl = null;

      if (ytInfo.video?.url) videoUrl = ytInfo.video.url;
      else if (Array.isArray(ytInfo.url)) videoUrl = ytInfo.url[0];
      else if (typeof ytInfo.url === "string") videoUrl = ytInfo.url;
      else if (ytInfo.formats?.[0]?.url) videoUrl = ytInfo.formats[0].url;

      if (!videoUrl) throw new Error("Video URL not found.");

      const safeTitle = topVideo.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
      const filename = `${safeTitle}.mp4`;
      const videoPath = path.join(downloadDir, filename);

      const videoWriter = fs.createWriteStream(videoPath);
      await new Promise((resolve, reject) => {
        https.get(videoUrl, (res) => {
          if (res.statusCode === 200) {
            res.pipe(videoWriter);
            videoWriter.on("finish", () => videoWriter.close(resolve));
          } else {
            reject(new Error(`Video download failed. Status: ${res.statusCode}`));
          }
        }).on("error", reject);
      });

      await ctx.replyWithVideo({ source: fs.createReadStream(videoPath), filename });
      deleteAfterTimeout(videoPath);

    } catch (err) {
      console.error("Video error:", err.message);
      ctx.reply("Video download mein problem aayi. Baad mein try karo.");
    }
  }
};
