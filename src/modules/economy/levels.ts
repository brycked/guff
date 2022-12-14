import { Listener } from '../../core'
import { ClientEvents, EmbedBuilder, Message, TextChannel } from 'discord.js'
import Xp from '../../schemata/Xp'
import Guild from '../../schemata/Guild'
import Filter from '../../schemata/Filter'

export function toLvl(xp: number) {
  return Math.floor(xp ** 0.5)
}

export function toXp(lvl: number) {
  return Math.floor(lvl) ** 2
}

export async function levelUp(inter: Message, before: number, after: number) {
  if (toLvl(after) <= toLvl(before)) return
  const embed = new EmbedBuilder()
    .setDescription(`${inter.author} has reached lvl 🏆**${toLvl(after)}**!`)
    .setFooter({
      text: `Collect ✨${toXp(toLvl(after) + 1) - after} more xp for lvl 🏆${toLvl(after) + 1}`
    })
    .setColor(inter.client.color)

  const channelId = (await Guild.findOne({ id: inter.guildId }))?.levelupChannel
  const fetched = channelId ? await inter.client.channels.fetch(channelId) : null
  if (channelId) await inter.client.channels.fetch(channelId)
  const channel = fetched instanceof TextChannel ? fetched : inter.channel

  await channel.send({
    embeds: [embed]
  })
}

export class XP extends Listener {
  name: string = 'xp'
  event: keyof ClientEvents = 'messageCreate'

  override async run(msg: Message) {
    if (!msg.inGuild()) return
    if (msg.author.bot) return
    if ((await Filter.findOne({ channelId: msg.channelId }, { levelups: 1 }))?.levelUps === false)
      return

    const xp = await Xp.findOneAndUpdate(
      { guildId: msg.guildId, userId: msg.author.id },
      {},
      { upsert: true, new: true }
    )
    await levelUp(msg, xp.value, ++xp.value)
    await xp.save()
  }
}
