require('dotenv').config()
const axios = require('axios').default

// https://discordjs.guide/additional-info/changes-in-v13.html#guild
const Discord = require('discord.js')
const { Client, Intents } = require('discord.js')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })
let tracker = 0
let allOverlaps = []
let smittList = []
let nigelList = []
let itemInfo = {}
// const logo = new Discord.MessageAttachment('./public/logo.png')

// discord developer portal
// https://discordjs.guide/popular-topics/embeds.html#embed-preview

function getChannel(channelName) {
  return client.channels.cache.find((channel) => channel.name === channelName)
}

function sendChannelMessage(channelName, message) {
  const theChannel = getChannel(channelName)
  if (theChannel) {
    try {
      theChannel.send(message)
    } catch (error) {
      console.log(`Error sending message to channel: '${theChannel}'`)
    }
  } else {
    console.log(`Channel: ${channelName} does not exist`)
  }
}

function createEmbed({
  name,
  id,
  description,
  todaysPrice,
  min,
  max,
  minDate,
  maxDate,
  daysSinceMin,
  daysSinceMax,
  potentialProfit,
  potentialLoss,
  icon,
  buyLimit,
  buyOrSell,
  isMembers,
}) {
  const fields = []
  const emptyField = {
    name: '\u200b',
    value: '\u200b',
    inline: true,
  }
  return {
    color: 0x0099ff,
    description,
    title: buyOrSell,
    author: {
      name,
      icon_url: icon,
      url: `https://runescape.wiki/w/${name.replaceAll(' ', '_')}`,
    },
    url: `https://runescape.wiki/w/${name.replaceAll(' ', '_')}`,
    thumbnail: {
      url: icon,
    },
    fields: [
      {
        name: '__Today__',
        value: `${todaysPrice.toLocaleString()} gp`,
        inline: true,
      },
      {
        name: '__ID__',
        value: id,
        inline: true,
      },
      {
        name: '__Buy Limit__',
        value: buyLimit.toLocaleString(),
        inline: true,
      },
      {
        name: `__Max - ${maxDate}__`,
        value: `${max.toLocaleString()} gp`,
        inline: true,
      },
      emptyField,
      {
        name: `__Min - ${minDate}__`,
        value: `${min.toLocaleString()} gp`,
        inline: true,
      },
      {
        name: `__Max Profit - ${daysSinceMax} days ago__`,
        value: `${potentialProfit.toLocaleString()} gp`,
        inline: true,
      },
      emptyField,
      {
        name: `__Max Loss - ${daysSinceMin} days ago__`,
        value: `${potentialLoss.toLocaleString()} gp`,
        inline: true,
      },
      {
        name: 'Members?',
        value: isMembers,
        inline: false,
      },
      ...fields,
    ],
    timestamp: new Date(),
  }
}

// eslint-disable-next-line no-unused-vars
function printTrackDataAndSendOverlaps(name, description, hasOverlap, id) {
  tracker += 1
  console.log(`#${tracker} : ${name} in ${description}`)
  if (hasOverlap) allOverlaps.push(id)

  if ((tracker % 250) === 0) {
    if (allOverlaps.length > 0) {
      sendChannelMessage('overlaps', allOverlaps.join(', '))
    }
    allOverlaps = []
  }
}

function calculateProfitAndSendMessage(
  id, todaysPrice, min, max, minTimeInMs, maxTimeInMs, name, buyLimit, description, icon, isMembers,
) {
  const nearMin = todaysPrice < (min * 1.1)
  const nearMax = todaysPrice > (max * 0.9)
  const hasOverlap = (max * 0.9) <= (min * 1.1)
  const potentialProfit = (max - todaysPrice) * buyLimit
  const potentialLoss = (min - todaysPrice) * buyLimit
  const todaysDate = new Date()
  const maxDate = new Date(maxTimeInMs).toLocaleDateString()
  const minDate = new Date(minTimeInMs).toLocaleDateString()
  const daysSinceMax = Math.round((todaysDate - maxTimeInMs) / (86400000))
  const daysSinceMin = Math.round((todaysDate - minTimeInMs) / (86400000))

  const exclude = potentialProfit <= 2000000
  const isSafeBet = potentialProfit > 2000000 && potentialProfit <= 4000000
  const isRiskyBet = potentialProfit > 4000000 && potentialProfit <= 20000000
  const isHolyCheeks = potentialProfit > 20000000
  const dontFilter = !exclude && !hasOverlap

  let channelName = isSafeBet ? 'safe-bets' : ''
  channelName = isRiskyBet ? 'risky-bets' : channelName
  channelName = isHolyCheeks ? 'holy-ch33ks-bets' : channelName

  const buyMessage = {
    embeds: [createEmbed({
      name,
      id,
      description,
      todaysPrice,
      min,
      max,
      minDate,
      maxDate,
      daysSinceMin,
      daysSinceMax,
      potentialProfit,
      potentialLoss,
      icon,
      buyLimit,
      buyOrSell: '__**BUY!**__',
      isMembers,
    })],
  }
  const sellMessage = {
    embeds: [createEmbed({
      name,
      id,
      description,
      todaysPrice,
      min,
      max,
      minDate,
      maxDate,
      daysSinceMin,
      daysSinceMax,
      potentialProfit,
      potentialLoss,
      icon,
      buyLimit,
      buyOrSell: '__**SELL!**__',
      isMembers,
    })],
  }

  // printTrackDataAndSendOverlaps(name, description, hasOverlap, id)

  if (dontFilter && nearMin) {
    sendChannelMessage(channelName, buyMessage)
    if (smittList.includes(parseInt(id, 10))) sendChannelMessage('smittward-list', buyMessage)
    if (nigelList.includes(parseInt(id, 10))) sendChannelMessage('nigel-list', buyMessage)
  }
  if (dontFilter && nearMax) {
    sendChannelMessage(channelName, sellMessage)
    if (smittList.includes(parseInt(id, 10))) sendChannelMessage('smittward-list', sellMessage)
    if (nigelList.includes(parseInt(id, 10))) sendChannelMessage('nigel-list', sellMessage)
  }
}

async function isItemMembers(id) {
  const getItemDetails = await axios.get(`https://services.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${id}`)
  return getItemDetails?.data?.item?.members || 'undefined'
}

function getGraph({
  name, id, buyLimit, description, icon, timeout,
}) {
  return axios.get(`https://secure.runescape.com/m=itemdb_rs/api/graph/${id}.json`)
    .then(async (res2) => {
      // if (!res2 || !res2.data || !res2.data.daily) {
      if (!(res2?.data?.daily)) {
        setTimeout(() => getGraph({
          name, id, buyLimit, description, icon, timeout,
        }), timeout)
      } else {
        const { daily } = res2.data
        let max = 0
        let min = 2147483647
        let maxTimeInMs = 0
        let minTimeInMs = 0
        let i = 0
        let todaysPrice = 0
        const dailyTimes = Object.keys(daily)
        const isGreaterThan100gp = daily[dailyTimes[0]] > 100

        if (isGreaterThan100gp) {
          dailyTimes.forEach((key) => {
            const price = daily[key]
            if (price > max) {
              max = price
              maxTimeInMs = parseInt(key, 10)
            }
            if (price < min) {
              min = price
              minTimeInMs = parseInt(key, 10)
            }
            if (i === dailyTimes.length - 1) todaysPrice = price
            i += 1
          })
          if (!!id && !!todaysPrice && !!min && !!max && !!name) {
            const isMembers = await isItemMembers(id)
            calculateProfitAndSendMessage(
              id,
              todaysPrice,
              min,
              max,
              minTimeInMs,
              maxTimeInMs,
              name,
              buyLimit,
              description,
              icon,
              isMembers,
            )
          } else {
            sendChannelMessage('missed-items', `missing data - ${name} :  max: ${max}, min: ${min}, today: ${todaysPrice}`)
          }
        }
      }
    })
    .catch((err) => console.log(`attempted to fetch: ${name} : ${id} - ${err}`))
}

function getAllItems() {
  // eslint-disable-next-line no-unused-vars
  const testingItems = {
    2357: {
      name: 'Gold bar',
      buylimit: 10000,
      type: 'Mining and Smithing',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=2357',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=2357',
      id: 2357,
    },
    2: {
      name: 'Cannonball',
      buylimit: 10000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=2',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=2',
      id: 2,
    },
    10033: {
      name: 'Chinchompa',
      buylimit: 20000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=10033',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=10033',
      id: 10033,
    },
    31595: {
      name: 'Cobalt skillchompa',
      buylimit: 20000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=31595',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=31595',
      id: 31595,
    },
    13953: {
      name: 'Corrupt Morrigan\'s javelin',
      buylimit: 100,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=13953',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=13953',
      id: 13953,
    },
    13957: {
      name: 'Corrupt Morrigan\'s throwing axe',
      buylimit: 500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=13957',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=13957',
      id: 13957,
    },
    31598: {
      name: 'Crimson skillchompa',
      buylimit: 20000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=31598',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=31598',
      id: 31598,
    },
    40995: {
      name: 'Crystal skillchompa',
      buylimit: 20000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=40995',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=40995',
      id: 40995,
    },
    11230: {
      name: 'Dragon dart',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=11230',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=11230',
      id: 11230,
    },
    35115: {
      name: 'Dragon javelin',
      buylimit: 1000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=35115',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=35115',
      id: 35115,
    },
    31375: {
      name: 'Dragon knife',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=31375',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=31375',
      id: 31375,
    },
    29543: {
      name: 'Dragon throwing axe',
      buylimit: 10,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=29543',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=29543',
      id: 29543,
    },
    25914: {
      name: 'Off-hand adamant dart',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25914',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25914',
      id: 25914,
    },
    25900: {
      name: 'Off-hand adamant knife',
      buylimit: 10000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25900',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25900',
      id: 25900,
    },
    25907: {
      name: 'Off-hand adamant throwing axe',
      buylimit: 1000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25907',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25907',
      id: 25907,
    },
    25912: {
      name: 'Off-hand black dart',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25912',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25912',
      id: 25912,
    },
    25902: {
      name: 'Off-hand black knife',
      buylimit: 10000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25902',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25902',
      id: 25902,
    },
    25909: {
      name: 'Off-hand bronze dart',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25909',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25909',
      id: 25909,
    },
    25897: {
      name: 'Off-hand bronze knife',
      buylimit: 10000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25897',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25897',
      id: 25897,
    },
    25903: {
      name: 'Off-hand bronze throwing axe',
      buylimit: 1000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25903',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25903',
      id: 25903,
    },
    25916: {
      name: 'Off-hand dragon dart',
      buylimit: 1500,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=25916',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=25916',
      id: 25916,
    },
    35116: {
      name: 'Off-hand dragon javelin',
      buylimit: 1000,
      type: 'Ammo',
      icon: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_sprite.gif?id=35116',
      icon_large: 'https://secure.runescape.com/m=itemdb_rs/1617015063009_obj_big.gif?id=35116',
      id: 35116,
    },
  }
  return axios.get(
    // 'https://raw.githubusercontent.com/NielsTack/runescape-3-grand-exchange-item-id-scraper/main/items.json',
    // 'https://raw.githubusercontent.com/NielsTack/runescape-3-item-database/master/iteminfo.json',
    'https://raw.githubusercontent.com/NielsTack/runescape-3-item-database/master/iteminfo_filtered.json',
  )
    .then((res) => res.data)
    .catch(() => { })
  // .then(() => testingItems)
}

function chunkArray(array, size) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size)
    result.push(chunk)
  }
  return result
}

function getTrackingIDsFromChannel() {
  smittList = []
  nigelList = []
  const addFavorites = (channelID, userList) => {
    channelID.messages.fetch({ limit: 1 }).then((messages) => {
      messages.forEach((message) => {
        message.content.split(', ').forEach((id) => {
          userList.push(parseInt(id, 10))
        })
      })
    })
  }
  // console.log(client.channels.cache)
  const smittIdChannel = client.channels.cache.get('828069115893776444')
  const nigelIdChannel = client.channels.cache.get('828069132795904010')
  addFavorites(smittIdChannel, smittList)
  addFavorites(nigelIdChannel, nigelList)
}

function getItemsThenGraph() {
  tracker = 0
  getTrackingIDsFromChannel()
  getAllItems().then((allItems) => {
    itemInfo = { ...itemInfo, ...allItems }
    const chunks = chunkArray(Object.entries(allItems), 1)

    chunks.forEach((chunk, index) => {
      chunk.forEach((curItem) => {
        const {
          id, name, buylimit, type, icon,
        } = curItem[1]
        const buyLimit = buylimit
        const description = type
        const timeout = 5000 * index

        setTimeout(() => getGraph({
          name, id: id.toString(), buyLimit, description, icon, timeout,
        }), timeout)
      })
    })
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clearBetsChannel(message) {
  const { name } = message.channel
  if (name) {
    message.channel.delete().then(() => {
      message.guild.channels.create(name, Discord.CategoryChannel).then(() => {
        getChannel(name).setParent(getChannel('bets').id)
      })
    })
  }
}

async function main() {
  console.log(' -------------------------------- Starting --------------------------------')

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`)
  })

  client.login(process.env.TOKEN)

  client.on('messageCreate', async (message) => {
    const serverName = message.guild.name
    const channelName = message.channel.name
    const oneHour = 3600000

    if (message.content.toLowerCase().startsWith('!clear')) {
      clearBetsChannel(message)
    }

    if (serverName === 'RS 🔥' && channelName === 'bot-commands') {
      if (message.content.match(/\d+\shour(s?)/g)) {
        const waitMsg = message.content.split(/\s/g)
        const numHours = parseInt(waitMsg[0], 10)
        console.log(`Waiting ${numHours} hours to start bot...`)
        setTimeout(() => {
          sendChannelMessage('bot-commands', 'go')
        }, (oneHour * numHours))
      } else if (message.content.match(/go/g)) {
        setTimeout(() => {
          sendChannelMessage('bot-commands', 'go')
        }, (oneHour * 24))

        sendChannelMessage('safe-bets', '!clear')
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000)
        sendChannelMessage('risky-bets', '!clear')
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000)
        sendChannelMessage('holy-ch33ks-bets', '!clear')
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000)

        const date = new Date()
        const timeStamp = `( ${date.toLocaleDateString()} - ${date.toLocaleTimeString()} )`
        console.log(`Running daily price checks... ${timeStamp}`)
        sendChannelMessage('bot-logs', `Running daily price checks... ${timeStamp}`)
        getItemsThenGraph()
        // eslint-disable-next-line no-await-in-loop
        await sleep(oneHour * 24)
      }
    }
  })
}

main()
