import { ChatInputCommand } from '../../core'
import {
  APIInteractionDataResolvedChannel,
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  GuildBasedChannel,
  User
} from 'discord.js'
import Wallet from '../../schemata/Wallet'
import Bank from '../../schemata/Bank'
import Xp from '../../schemata/Xp'
import Guild from '../../schemata/Guild'

export class Set extends ChatInputCommand {
  name = 'set'
  description = "Set someone's stats"

  constructor() {
    super()
    this.defaultMemberPermissions = ['Administrator']
    this.options = ['wallet', 'bank', 'xp'].map((stat) => ({
      type: ApplicationCommandOptionType.Subcommand,
      name: stat,
      description: `Set someone's ${stat}`,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'target',
          description: `Whose ${stat} to set`,
          required: true
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'value',
          description: `What to set the ${stat} to`,
          minValue: 0,
          required: true
        }
      ]
    }))

    this.options.push({
      type: ApplicationCommandOptionType.Subcommand,
      name: 'channel',
      description: 'Set the channel for an event',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'event',
          description: 'The event',
          choices: [
            {
              name: 'Level-UPs',
              value: 'levelup'
            },
            { name: 'Welcome', value: 'welcome' }
          ],
          required: true
        },
        {
          type: ApplicationCommandOptionType.Channel,
          name: 'channel',
          description: 'The Channel to set it to. Omit to reset.',
          channelTypes: [ChannelType.GuildText]
        }
      ]
    })
  }

  override async run(inter: ChatInputCommandInteraction) {
    const stat = inter.options.getSubcommand()
    if (stat === 'wallet' || stat === 'bank' || stat === 'xp')
      await this.setStat(
        inter,
        stat,
        inter.options.getUser('target', true),
        inter.options.getInteger('value', true)
      )
    else if (stat === 'channel')
      await this.setChannel(
        inter,
        inter.options.getString('event', true) as 'levelup' | 'welcome',
        inter.options.getChannel('channel')
      )
  }

  async setStat(
    inter: ChatInputCommandInteraction,
    stat: 'wallet' | 'bank' | 'xp',
    target: User,
    value: number
  ) {
    const Collection = { wallet: Wallet, bank: Bank, xp: Xp }[stat]
    await Collection.findOneAndUpdate(
      { guildId: inter.guildId, userId: target.id },
      { $set: { value } },
      { upsert: true }
    )

    const embed = new EmbedBuilder()
      .setDescription(`Set ${target}'s ${stat} to **${value}**`)
      .setColor(Colors.Green)

    await inter.reply({
      embeds: [embed],
      ephemeral: true
    })
  }

  async setChannel(
    inter: ChatInputCommandInteraction,
    event: 'levelup' | 'welcome',
    channel: APIInteractionDataResolvedChannel | GuildBasedChannel | null
  ) {
    await Guild.findOneAndUpdate(
      { id: inter.guildId },
      { [channel ? '$set' : '$unset']: { [`${event}Channel`]: channel?.id ?? '' } },
      { upsert: true }
    )

    const embed = new EmbedBuilder()
      .setDescription(
        channel
          ? `Set **${{ levelup: 'Level-UPs', welcome: 'Welcome' }[event]}** channel to <#${
              channel?.id
            }>`
          : `Reset **${{ levelup: 'Level-UPs', welcome: 'Welcome' }[event]}** channel`
      )
      .setColor(Colors.Green)

    await inter.reply({
      embeds: [embed],
      ephemeral: true
    })
  }
}

export class Add extends ChatInputCommand {
  name = 'add'
  description = "Add to someone's stats"

  constructor() {
    super()
    this.defaultMemberPermissions = ['Administrator']
    this.options = ['wallet', 'bank', 'xp'].map((stat) => ({
      type: ApplicationCommandOptionType.Subcommand,
      name: stat,
      description: `Add to someone's ${stat}`,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'target',
          description: `Whose ${stat} to add to`,
          required: true
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'amount',
          description: `How much to add to the ${stat}`,
          required: true
        }
      ]
    }))
  }

  override async run(inter: ChatInputCommandInteraction) {
    const stat = inter.options.getSubcommand() as 'wallet' | 'bank' | 'xp'
    const amount = inter.options.getInteger('amount', true)
    const target = inter.options.getUser('target', false) ?? inter.user

    const Collection = { wallet: Wallet, bank: Bank, xp: Xp }[stat]
    await Collection.findOneAndUpdate(
      { guildId: inter.guildId, userId: target.id },
      { $inc: { value: amount } },
      { upsert: true }
    )

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(
        amount >= 0
          ? `Added **${amount}** to ${target}'s ${stat}`
          : `Removed **${-amount}** from ${target}'s ${stat}`
      )

    await inter.reply({
      embeds: [embed],
      ephemeral: true
    })
  }
}
