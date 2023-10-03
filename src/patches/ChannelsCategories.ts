import { PluginInjector, PluginLogger, SettingValues } from "../index";
import {
  CategoryStore,
  Channel,
  ChannelListStore,
  ChannelStore,
  DiscordConstants,
  GuildChannelStore,
} from "../lib/requiredModules";
import { defaultSettings } from "../lib/consts";
import * as Utils from "../lib/utils";
import * as Types from "../types";

export const patchChannelCategories = (): void => {
  PluginInjector.after(CategoryStore, "isCollapsed", (args, res) => {
    if (
      !args[0]?.endsWith("hidden") ||
      !SettingValues.get("alwaysCollapse", defaultSettings.alwaysCollapse)
    )
      return res;
    return SettingValues.get("alwaysCollapse", defaultSettings.alwaysCollapse) && res;
  });

  PluginInjector.after(GuildChannelStore, "getChannels", (args: [string], res) => {
    const GuildCategories = res[DiscordConstants.ChanneTypes.GUILD_CATEGORY];
    const hiddenId = `${args[0]}_hidden`;
    const hiddenCategory = GuildCategories?.find(
      (m: Types.GuildChannel) => m.channel.id == hiddenId,
    );
    if (!hiddenCategory) return res;
    const noHiddenCats = GuildCategories.filter(
      (m: Types.GuildChannel) => m.channel.id !== hiddenId,
    ) as Types.GuildChannel[];
    const newComprator =
      (
        noHiddenCats[noHiddenCats.length - 1] || {
          comparator: 0,
        }
      ).comparator + 1;
    Object.defineProperty(hiddenCategory.channel, "position", {
      value: newComprator,
      writable: true,
    });
    Object.defineProperty(hiddenCategory, "comparator", {
      value: newComprator,
      writable: true,
    });
    return res;
  });

  PluginInjector.after(ChannelStore, "getChannel", (args, res) => {
    if (
      SettingValues.get("sort", defaultSettings.sort) !== "extra" ||
      SettingValues.get("blacklistedGuilds", defaultSettings.blacklistedGuilds)[
        args[0]?.replace("_hidden", "")
      ] ||
      !args[0]?.endsWith("_hidden")
    )
      return res;
    const HiddenCategoryChannel = new Channel({
      guild_id: args[0]?.replace("_hidden", ""),
      id: args[0],
      name: "Hidden Channels",
      type: DiscordConstants.ChanneTypes.GUILD_CATEGORY,
    });
    return HiddenCategoryChannel;
  });

  PluginInjector.after(ChannelStore, "getMutableGuildChannelsForGuild", (args, res) => {
    if (
      SettingValues.get("sort", defaultSettings.sort) !== "extra" ||
      SettingValues.get("blacklistedGuilds", defaultSettings.blacklistedGuilds)[args[0]]
    )
      return res;
    const hiddenId = `${args[0]}_hidden`;
    const HiddenCategoryChannel = new Channel({
      guild_id: args[0],
      id: hiddenId,
      name: "Hidden Channels",
      type: DiscordConstants.ChanneTypes.GUILD_CATEGORY,
    });
    const GuildCategories = GuildChannelStore.getChannels(args[0])[
      DiscordConstants.ChanneTypes.GUILD_CATEGORY
    ] as Array<{ channel: Types.Channel; comparator: number }>;
    Object.defineProperty(HiddenCategoryChannel, "position", {
      value:
        (
          GuildCategories[GuildCategories.length - 1] || {
            comparator: 0,
          }
        ).comparator + 1,
      writable: true,
    });
    if (!res[hiddenId]) res[hiddenId] = HiddenCategoryChannel;
    return res;
  });

  //* Custom category or sorting order
  PluginInjector.after(ChannelListStore, "getGuild", (args: [string], res: Types.ChannelList) => {
    if (SettingValues.get("debugMode", defaultSettings.debugMode))
      PluginLogger.log("ChannelList", res);
    if (SettingValues.get("blacklistedGuilds", defaultSettings.blacklistedGuilds)[args[0]]) return;
    switch (SettingValues.get("sort", defaultSettings.sort)) {
      case "bottom": {
        Utils.sortChannels(res.guildChannels.favoritesCategory);
        Utils.sortChannels(res.guildChannels.recentsCategory);
        Utils.sortChannels(res.guildChannels.noParentCategory);
        for (const id in res.guildChannels.categories) {
          Utils.sortChannels(res.guildChannels.categories[id]);
        }
        break;
      }

      case "extra": {
        const hiddenId = `${args[0]}_hidden`;
        const HiddenCategory = res.guildChannels.categories[hiddenId];
        const hiddenChannels = Utils.getHiddenChannelRecord(
          [
            res.guildChannels.favoritesCategory,
            res.guildChannels.recentsCategory,
            res.guildChannels.noParentCategory,
            ...Object.values(res.guildChannels.categories).filter(
              (m: Types.ChannelListCategory) => m.id !== hiddenId,
            ),
          ],
          args[0],
        );

        HiddenCategory.channels = Object.fromEntries(
          Object.entries(hiddenChannels.records).map(
            ([id, channel]: [string, Types.ChannelRecord]) => {
              channel.category = HiddenCategory;
              return [id, channel];
            },
          ),
        );
        HiddenCategory.isCollapsed = Boolean(res.guildChannels.collapsedCategoryIds[hiddenId]);
        HiddenCategory.shownChannelIds =
          res.guildChannels.collapsedCategoryIds[hiddenId] || HiddenCategory.isCollapsed
            ? []
            : hiddenChannels.channels
                .sort((x: Types.Channel, y: Types.Channel) => {
                  const xPos = x.position + (x.isGuildVocal() ? 1e4 : 1e5);
                  const yPos = y.position + (y.isGuildVocal() ? 1e4 : 1e5);
                  return xPos < yPos ? -1 : xPos > yPos ? 1 : 0;
                })
                .map((m: Types.Channel) => m.id);
        break;
      }
    }

    if (SettingValues.get("shouldShowEmptyCategory", defaultSettings.shouldShowEmptyCategory)) {
      Utils.patchEmptyCategoryFunction([
        ...Object.values(res.guildChannels.categories).filter(
          (m: Types.ChannelListCategory) => !m.id.includes("hidden"),
        ),
      ]);
    }

    return res;
  });
};
