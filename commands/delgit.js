const axios = require('axios');

module.exports.config = {
  name: "delgit",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Arun",
  description: "Interactive menu to delete files from a GitHub repository.",
  usages: "",
  commandCategory: "Admin",
  cooldowns: 0,
  dependencies: {
    "axios": ""
  },
  envConfig: {
    githubToken: "YOUR_GITHUB_TOKEN_HERE" 
  }
};

// Main function जो command चलाने पर चलता है
module.exports.run = async function ({ api, event }) {
  const { threadID, messageID, senderID } = event;
  const githubToken = global.configModule[this.config.name].githubToken;

  if (!githubToken || githubToken === "YOUR_GITHUB_TOKEN_HERE") {
    return api.sendMessage(
      "❌ GitHub Personal Access Token missing or not set. Please add it to config.json.",
      threadID,
      messageID
    );
  }

  try {
    const tokenHeader = {
      Authorization: `token ${githubToken}`
    };
    const response = await axios.get("https://api.github.com/user/repos", { headers: tokenHeader });
    const repos = response.data;

    if (repos.length === 0) {
      return api.sendMessage("❌ आपकी कोई repositories नहीं हैं।", threadID, messageID);
    }

    let repoListMessage = `📂 अपनी एक Repository चुनें:\n\n`;
    repos.forEach((repo, index) => {
      repoListMessage += `${index + 1}. ${repo.name}\n`;
    });

    api.sendMessage(repoListMessage, threadID, (error, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID,
        type: "select_repo_delete",
        repos: repos
      });
    });
  } catch (error) {
    console.error(error);
    api.sendMessage("GitHub repositories fetch करने में त्रुटि हुई।", threadID, messageID);
  }
};

// Reply को handle करने का function
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;

  if (handleReply.author !== senderID) return;
  
  const githubToken = global.configModule[handleReply.name].githubToken;
  const tokenHeader = {
    Authorization: `token ${githubToken}`
  };
  const owner = "YOUR_GITHUB_USERNAME_HERE"; // यहाँ अपना GitHub username डालें

  switch (handleReply.type) {
    case "select_repo_delete":
      const repoIndex = parseInt(body) - 1;
      if (isNaN(repoIndex) || repoIndex < 0 || repoIndex >= handleReply.repos.length) {
        return api.sendMessage("❌ अवैध चयन। कृपया सूची से एक वैध नंबर reply करें।", threadID, messageID);
      }
      
      const selectedRepo = handleReply.repos[repoIndex];
      api.sendMessage(
        `✅ आपने "${selectedRepo.name}" चुना। अब कृपया फ़ाइल या फ़ोल्डर के नाम का एक keyword भेजें जिसे आप खोजना चाहते हैं:`,
        threadID, (error, info) => {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "search_file",
            repo: selectedRepo
          });
        });
      break;

    case "search_file":
      const keyword = body.trim();
      if (!keyword) {
        return api.sendMessage("❌ कृपया एक keyword भेजें।", threadID, messageID);
      }

      const { repo: searchRepo } = handleReply;
      try {
        const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(keyword)}+repo:${owner}/${searchRepo.name}`;
        const searchResponse = await axios.get(searchUrl, { headers: tokenHeader });
        const items = searchResponse.data.items;

        if (items.length === 0) {
          return api.sendMessage(`❌ "${searchRepo.name}" में "${keyword}" से संबंधित कोई फ़ाइल नहीं मिली।`, threadID, messageID);
        }

        let fileListMessage = `🔍 "${searchRepo.name}" में "${keyword}" से संबंधित फ़ाइलें:\n\n`;
        const filesFound = items.map((item, index) => {
          return {
            path: item.path,
            name: item.name
          };
        });

        filesFound.forEach((file, index) => {
          fileListMessage += `${index + 1}. ${file.path}\n`;
        });

        fileListMessage += `\nकृपया फ़ाइल को हटाने के लिए उसका नंबर reply करें।`;

        api.sendMessage(fileListMessage, threadID, (error, info) => {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "select_file_delete",
            repo: searchRepo,
            files: filesFound
          });
        });
      } catch (error) {
        console.error(error);
        api.sendMessage("❌ फ़ाइलें खोजने में त्रुटि हुई।", threadID, messageID);
      }
      break;

    case "select_file_delete":
      const fileIndex = parseInt(body) - 1;
      if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= handleReply.files.length) {
        return api.sendMessage("❌ अवैध चयन। कृपया सूची से एक वैध नंबर reply करें।", threadID, messageID);
      }
      
      const fileToDelete = handleReply.files[fileIndex];
      const { repo: deleteRepo } = handleReply;

      try {
        // फ़ाइल का SHA प्राप्त करें
        const fileInfo = await axios.get(`https://api.github.com/repos/${owner}/${deleteRepo.name}/contents/${fileToDelete.path}`, { headers: tokenHeader });
        const sha = fileInfo.data.sha;
        
        await axios.delete(`https://api.github.com/repos/${owner}/${deleteRepo.name}/contents/${fileToDelete.path}`, {
          headers: tokenHeader,
          data: {
            message: `Remove file via bot: ${fileToDelete.path}`,
            sha: sha
          }
        });
        api.sendMessage(`✅ File "${fileToDelete.path}" successfully removed from "${deleteRepo.name}".`, threadID, messageID);

      } catch (e) {
        console.error(e);
        api.sendMessage(`❌ फ़ाइल हटाने में त्रुटि: ${e.message}`, threadID, messageID);
      }
      break;
  }
};
