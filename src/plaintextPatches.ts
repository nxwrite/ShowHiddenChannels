import * as Types from "./types";
export default [
  {
    find: '"GuildContextMenu:',
    replacements: [
      {
        match: /(\w=(\w)\.id)/,
        replace: `$1,_guild=$2`,
      },
      {
        match: /\[(\w+,__OVERLAY__\?null:\w+,\w+,\w+)\]/,
        replace: `[$1,replugged.plugins.getExports('dev.tharki.ShowHiddenChannels')?.makeSHCContextMenuEntry(_guild)]`,
      },
    ],
  },
  {
    find: "isCopiedStreakGodlike",
    replacements: [
      {
        match: /(\.isLastChannel,\w+=(\w+)\.onChannelClick)/,
        replace: `$1,{channel}=$2`,
      },
      {
        match:
          /(\.channelName,children:\[)(\(0,\w+\.jsx\)\([\w$_]+\.[\w$_]+,{channel:\w+,guild:\w+}\))/,
        replace: `$1replugged.plugins.getExports('dev.tharki.ShowHiddenChannels')?.makeChannelBrowerLockIcon({channel,originalIcon:$2})`,
      },
    ],
  },
  {
    find: /\.displayName="PermissionStore"/,
    replacements: [
      {
        match:
          /((\w+)\.__getLocalVars=function\(\){.{0,1}return.{0,1}{.{0,1}guildCache:(\w+),.{0,1}channelCache:(\w+),.{0,1}guildVersions:(\w+),.{0,1}channelsVersion:(\w+).{0,1}}.{0,1}}.{0,1};)/s,
        replace: `$2.clearVars=function(){$3={};$4={};$5={};$6=0;};$1`,
      },
    ],
  },
  {
    find: /\.displayName="ChannelListStore"/,
    replacements: [
      {
        match:
          /((\w+)\.__getLocalVars=function\(\){.{0,1}return.{0,1}{.{0,1}lastSelectedChannelId:(\w+),.{0,1}lastSelectedVoiceChannelId:(\w+),.{0,1}state:(\w+).{0,1}}.{0,1}}.{0,1};)/s,
        replace: `$2.clearVars=function(){$3=null;$4=null;$5.clear();};$1`,
      },
    ],
  },
] as Types.DefaultTypes.PlaintextPatch[];
