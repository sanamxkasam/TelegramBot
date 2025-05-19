const { Telegraf } = require('telegraf');

module.exports = {
  name: 'member',
  description: 'List group members or show info about a specific member.',
  category: 'group',
  usage: `/member list\n/member info @username`,
  hasPermission: 0,
  cooldown: 5,
  credits: 'Your Name',

  run: async (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args[1] === 'list') {
      try {
        const chat = await ctx.getChat();
        if (chat.type === 'group' || chat.type === 'supergroup') {
          const members = await ctx.getChatMembers();
          let memberList = '*Group Members:*\n';
          members.forEach(member => {
            memberList += `- ${member.user.first_name} ${member.user.last_name || ''} (@${member.user.username || member.user.id})\n`;
          });
          return ctx.replyWithMarkdown(memberList);
        } else {
          return ctx.reply('Yeh command sirf groups mein kaam karegi.');
        }
      } catch (error) {
        console.error('Error fetching member list:', error);
        return ctx.reply('Member list fetch karne mein error aayi.');
      }
    } else if (args[1] === 'info' && args[2]) {
      const mention = args[2];
      if (mention.startsWith('@')) {
        const username = mention.substring(1);
        try {
          const chat = await ctx.getChat();
          if (chat.type === 'group' || chat.type === 'supergroup') {
            const members = await ctx.getChatMembers();
            const targetMember = members.find(member => member.user.username === username);
            if (targetMember) {
              const user = targetMember.user;
              let userInfo = `*User Info for @${username}:*\n`;
              userInfo += `*ID:* \`${user.id}\`\n`;
              userInfo += `*First Name:* ${user.first_name}\n`;
              if (user.last_name) {
                userInfo += `*Last Name:* ${user.last_name}\n`;
              }
              if (user.username) {
                userInfo += `*Username:* @${user.username}\n`;
              }
              userInfo += `*Is Bot:* ${user.is_bot ? 'Yes' : 'No'}\n`;

              const profilePhotos = await ctx.telegram.getUserProfilePhotos(user.id);
              if (profilePhotos.total_count > 0) {
                const latestPhoto = profilePhotos.photos[0][0].file_id;
                await ctx.replyWithPhoto(latestPhoto, { caption: userInfo, parse_mode: 'Markdown' });
              } else {
                await ctx.replyWithMarkdown(userInfo);
              }
            } else {
              return ctx.reply(`User @${username} group mein nahi mila.`);
            }
          } else {
            return ctx.reply('Yeh command sirf groups mein kaam karegi.');
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
          return ctx.reply('User info fetch karne mein error aayi.');
        }
      } else {
        return ctx.reply('Please mention a user using @username format.');
      }
    } else {
      return ctx.replyWithMarkdown(`*Usage:*\n\`${this.usage}\``);
    }
  },
};
