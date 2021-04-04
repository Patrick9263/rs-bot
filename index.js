require('dotenv').config()
const Discord = require('discord.js')
const axios = require('axios').default

const client = new Discord.Client()
let tracker = 0
let allOverlaps = []
let getBuyLimit = {}
// const logo = new Discord.MessageAttachment('./public/logo.png')

// discord developer portal
// https://stackoverflow.com/questions/38819582/how-to-pull-message-data-from-discord-js
// https://discordjs.guide/popular-topics/embeds.html#embed-preview

console.log(' -------------------------------- Starting --------------------------------')
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
})
client.login(process.env.TOKEN)

function sendChannelMessage(channelName, message) {
  const theChannel = client.channels.cache.find((channel) => channel.name === channelName)
  if (theChannel) {
    theChannel.send(message)
  } else {
    console.log(`Channel: ${channelName} does not exist`)
  }
}

function createEmbed(data) {
  const {
    name, description, todaysPrice, max, min, icon, limit, buyOrSell,
  } = data

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
        value: `${todaysPrice} gp`,
        inline: true,
      },
      emptyField,
      {
        name: '__Buy Limit__',
        value: limit,
        inline: true,
      },
      {
        name: '__Max__',
        value: `${max} gp`,
        inline: true,
      },
      emptyField,
      {
        name: '__Min__',
        value: `${min} gp`,
        inline: true,
      },
      ...fields,
    ],
    timestamp: new Date(),
  }
}

const lookupChannel = {
  Miscellaneous: '',
  Ammo: 'ammo',
  Arrows: 'arrows',
  Bolts: 'bolts',
  'Construction materials': 'construction-materials',
  'Construction products': 'construction-products',
  'Cooking ingredients': 'cooking-ingredients',
  Costumes: 'costumes',
  'Crafting materials': 'crafting-materials',
  Familiars: 'familiars',
  'Farming produce': 'farming-produce',
  'Fletching materials': 'fletching-materials',
  'Food and Drink': 'food-and-drink',
  'Herblore materials': 'herblore-materials',
  'Hunting equipment': 'hunting-equipment',
  'Hunting Produce': 'hunting-produce',
  Jewellery: 'jewellery',
  'Mage armour': 'mage-armour',
  'Mage weapons': 'mage-weapons',
  'Melee armour - low level': 'melee-armour-low-level',
  'Melee armour - mid level': 'melee-armour-mid-level',
  'Melee armour - high level': 'melee-armour-high-level',
  'Melee weapons - low level': 'melee-weapons-low-level',
  'Melee weapons - mid level': 'melee-weapons-mid-level',
  'Melee weapons - high level': 'melee-weapons-high-level',
  'Mining and Smithing': 'mining-and-smithing',
  Potions: 'potions',
  'Prayer armour': 'prayer-armour',
  'Prayer materials': 'prayer-materials',
  'Range armour': 'range-armour',
  'Range weapons': 'range-weapons',
  Runecrafting: 'runecrafting',
  'Runes, Spells and Teleports': 'runes-spells-and-teleports',
  Seeds: 'seeds',
  'Summoning scrolls': 'summoning-scrolls',
  'Tools and containers': 'tools-and-containers',
  'Woodcutting product': 'woodcutting-product',
  'Pocket items': 'pocket-items',
  'Stone spirits': 'stone-spirits',
  Salvage: 'salvage',
  'Firemaking products': 'firemaking-products',
  'Archaeology materials': 'archaeology-materials',
}

function getAllItems() {
  // eslint-disable-next-line no-unused-vars
  const testingItems = {
    'Air orb': 573,
    'Gold Bar': 2357,
    'Adamant brutal': 4798,
    'Adamant dart': 810,
    'Adamant javelin': 829,
    'Adamant knife': 867,
    'Adamant throwing axe': 804,
    'Azure skillchompa': 31597,
    'Gilded 4-poster': 8588,
    'Gilded bench': 8574,
    'Gilded cape rack': 9846,
    'Gilded clock': 8594,
    'Gilded dresser': 8608,
    'Gilded magic wardrobe': 9857,
    'Gilded wardrobe': 8622,
    'Greenman\'s ale': 1909,
    'Large oak bed': 8580,
    'Large teak bed': 8584,
    'Raw blue blubber jellyfish': 42265,
    'Raw catfish': 40289,
    'Raw cave eel': 5001,
    'Raw cavefish': 15264,
    'Raw chicken': 2138,
    'Raw chompy': 2876,
    'Raw cod': 341,
    'Raw corbicula rex meat': 47968,
    'Raw crayfish': 13435,
    'Raw crunchies': 2202,
    'Raw desert sole': 40287,
    'Raw fish pie': 7186,
    'Raw garden pie': 7176,
    'Raw great white shark': 34727,
    'Raw green blubber jellyfish': 42256,
    'Raw herring': 345,
    'Raw jubbly': 7566,
    'Raw karambwan': 3142,
    'Raw lobster': 377,
    'Raw mackerel': 353,
    'Raw malletops meat': 47976,
  }
  return axios.get(
    'https://raw.githubusercontent.com/NielsTack/runescape-3-grand-exchange-item-id-scraper/main/items.json',
  )
    .then((res) => res.data)
    // .then(() => testingItems)
}

function getItemDetailsAndSendMessage(data) {
  const {
    id, todaysPrice, min, max, name,
  } = data

  return axios.get(`https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${id}`)
    .then((res3) => {
      if (!res3 || !res3.data || !res3.data.item || !res3.data.item.type || !res3.data.item.icon) {
        setTimeout(() => getItemDetailsAndSendMessage(data), 5000)
      } else {
        const { type, icon } = res3.data.item
        const nearMin = todaysPrice < (min * 1.1)
        const nearMax = todaysPrice > (max * 0.9)
        const hasOverlap = (max * 0.9) <= (min * 1.1)
        const limit = getBuyLimit[id]
        const potentialProfit = (max - min) * limit
        const exclude = potentialProfit <= 2000000
        const isSafeBet = potentialProfit > 2000000 && potentialProfit <= 4000000
        const isRiskyBet = potentialProfit > 4000000 && potentialProfit <= 10000000
        const isHolyCheeks = potentialProfit > 10000000
        const description = lookupChannel[type]
        let channelName = isSafeBet ? 'safe-bets' : ''
        channelName = isRiskyBet ? 'risky-bets' : channelName
        channelName = isHolyCheeks ? 'holy-ch33ks-bets' : channelName

        tracker += 1
        console.log(`#${tracker} : ${name} in ${type}`)
        if (hasOverlap) allOverlaps.push(id)
        if ((tracker % 250) === 0) {
          sendChannelMessage('overlaps', allOverlaps.join(', '))
          allOverlaps = []
        }

        if (!exclude && !hasOverlap && nearMin) {
          // console.log(`sending near min message for ${name} in ${type}...`)
          sendChannelMessage(channelName, {
            embed: createEmbed({
              name, description, todaysPrice, max, min, icon, limit, buyOrSell: '__**BUY!**__',
            }),
          })
        }

        if (!exclude && !hasOverlap && nearMax) {
          // console.log(`sending near max message for ${name} in ${type}...`)
          sendChannelMessage(channelName, {
            embed: createEmbed({
              name, description, todaysPrice, max, min, icon, limit, buyOrSell: '__**SELL!**__',
            }),
          })
        }
      }
    })
    .catch((err) => {
      if (!!id && !!todaysPrice && !!min && !!max && !!name) {
        setTimeout(() => getItemDetailsAndSendMessage(
          id, todaysPrice, min, max, name,
        ),
        5000)
      } else {
        // console.log(`Error getting details: ${name} - ${id} - ${todaysPrice} - ${min} - ${max}`)
        console.log(`Error: ${err}`)
      }
    })
}

function getGraph(name, id, timeout) {
  return axios.get(`https://secure.runescape.com/m=itemdb_rs/api/graph/${id}.json`)
    .then((res2) => {
      if (!res2 || !res2.data || !res2.data.daily) {
        setTimeout(() => getGraph(name, id, timeout), timeout)
      } else {
        const { daily } = res2.data
        let max = 0
        let min = 2147483647
        let i = 0
        let todaysPrice = 0

        const isValuable = daily[Object.keys(daily)[0]] > 100
        if (isValuable) {
          Object.keys(daily).forEach((key) => {
            const price = daily[key]
            max = (price > max) ? price : max
            min = (price < min) ? price : min
            todaysPrice = (i === 179) ? price : todaysPrice
            i += 1
          })
          if (!!id && !!todaysPrice && !!min && !!max && !!name) {
            getItemDetailsAndSendMessage({
              id, todaysPrice, min, max, name,
            })
          } else {
            console.log(`missing data - ${name} :  max: ${max}, min: ${min}, today: ${todaysPrice}`)
          }
        }
      }
    })
    .catch((err) => console.log(`attempted to fetch: ${name} : ${id} - ${err}`))
}

function chunkArray(array, size) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size)
    result.push(chunk)
  }
  return result
}

function calculateProfit() {
  tracker = 0
  axios.get(
    'https://raw.githubusercontent.com/NielsTack/runescape-buy-limit-per-item-id/master/buylimits.json',
  ).then((res) => {
    getBuyLimit = res.data

    getAllItems().then((allItems) => {
      const chunks = chunkArray(Object.entries(allItems), 1)
      chunks.forEach((chunk, index) => {
        chunk.forEach((curItem) => {
          const name = curItem[0]
          const id = curItem[1]
          const timeout = 5000 * index
          setTimeout(() => getGraph(name, id, timeout), timeout)
        })
      })
    })
  })
}

client.on('message', (message) => {
  const serverName = message.guild.name
  const channelName = message.channel.name
  if (serverName === 'RS 🔥' && channelName === 'lul') {
    setTimeout(calculateProfit, 0)
  }
})
