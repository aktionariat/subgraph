import { Address, log} from "@graphprotocol/graph-ts"
import { Trade, PriceSet } from "../generated/templates/Brokerbot/Brokerbot"
import {   
  Registry,
  Brokerbot,
  Token,
  Transaction,
  Swap as SwapEvent 
} from "../generated/schema"
import {
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply,
  fetchTokenBalance,
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  ONE_BD,
  convertTokenToDecimal,
  convertToUsd,
  convertToChf,
  REGISTRY_ADDRESS,
  getRegistry,
  fetchTokenTotalShares
} from './utils/helpers'
import { updateAktionariatDayData, updateAktionariatWeekData, updateBrokerbotDayData, updateBrokerbotHourData, updateBrokerbotWeekData, updateTokenDayData, updateTokenHourData, updateTokenWeekData } from "./utils/intervalUpdates"

export function handleTrade(event: Trade): void {
  // load registry
  let registry = getRegistry(REGISTRY_ADDRESS.toHexString())

  // load brokerbot
  const BROKERBOT_ADDRESS = event.address.toHexString()
  let brokerbot = Brokerbot.load(BROKERBOT_ADDRESS)
  if (brokerbot === null) {
    brokerbot = new Brokerbot(BROKERBOT_ADDRESS)
    brokerbot.base = event.params.base.toHexString()
    brokerbot.token = event.params.token.toHexString()
    registry.marketCount = registry.marketCount.plus(ONE_BI)
  }

  // load the base currency
  let base = Token.load(brokerbot.base)
  //fetch info if null
  if (base === null) {
    base = new Token(event.params.base.toHexString())
    base.symbol = fetchTokenSymbol(event.params.base)
    base.name = fetchTokenName(event.params.base)
    base.totalSupply = fetchTokenTotalSupply(event.params.base)
    base.decimals = fetchTokenDecimals(event.params.base)

    base.derivedXCHF = ONE_BD
    base.derivedUSD = convertToUsd(base.id, base.derivedXCHF);
    base.tradeVolume = ZERO_BD
    base.tradeVolumeUSD = ZERO_BD
    base.tradeVolumeXCHF = ZERO_BD
    base.totalValueLocked = ZERO_BD
    base.txCount = ZERO_BI
  }

  // load share token
  let token = Token.load(brokerbot.token)
  //fetch info if null
  if (token === null) {
    token = new Token(event.params.token.toHexString())
    token.symbol = fetchTokenSymbol(event.params.token)
    token.name = fetchTokenName(event.params.token)
    token.totalSupply = fetchTokenTotalSupply(event.params.token)
    token.decimals = fetchTokenDecimals(event.params.token)
    token.totalShares = fetchTokenTotalShares(event.params.token)

    token.derivedXCHF = ZERO_BD
    token.derivedUSD = ZERO_BD
    token.tradeVolume = ZERO_BD
    token.tradeVolumeUSD = ZERO_BD
    token.tradeVolumeXCHF = ZERO_BD
    token.totalValueLocked = ZERO_BD
    token.totalValueLockedXCHF = ZERO_BD
    token.totalValueLockedUSD = ZERO_BD
    token.txCount = ZERO_BI
    token.firstTradePriceXCHF = ZERO_BD

    // if there is a new token means new market on the registry
    registry.tokenCount = registry.tokenCount.plus(ONE_BI)
  }
  
  let amountBase = convertTokenToDecimal(event.params.totPrice, base.decimals)
  let amountToken = convertTokenToDecimal(event.params.amount.abs(), token.decimals)
  let amountUSD = convertToUsd(base.id, amountBase)
  let amountXCHF = convertToChf(Address.fromString(base.id), amountBase)

  // reset total liquidity amounts
  base.totalValueLocked = base.totalValueLocked.minus(brokerbot.reserveBase)
  // token.totalValueLocked = token.totalValueLocked.minus(brokerbot.reserveToken) // is overwritten with brokerbot data, right now only one active 
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(brokerbot.totalValueLockedXCHF)
  registry.totalValueLockedUSD = registry.totalValueLockedUSD.minus(brokerbot.totalValueLockedUSD)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.minus(brokerbot.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.minus(brokerbot.totalRaisedUSD)
  registry.liquidityUSD = registry.liquidityUSD.minus(brokerbot.liquidityUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.minus(brokerbot.liquidityXCHF)

  // get current brokerbot balance
  let brokerbotBaseBalance  = convertTokenToDecimal(fetchTokenBalance(event.params.base, Address.fromString(brokerbot.id)), base.decimals)
  let brokerbotTokenBalance = convertTokenToDecimal(fetchTokenBalance(event.params.token, Address.fromString(brokerbot.id)), token.decimals)
  
  
  // update brokerbot data
  brokerbot.volumeBase = brokerbot.volumeBase.plus(amountBase)
  brokerbot.volumeToken = brokerbot.volumeToken.plus(amountToken)
  brokerbot.volumeUSD = brokerbot.volumeUSD.plus(amountUSD)
  brokerbot.volumeXCHF = brokerbot.volumeXCHF.plus(amountXCHF)
  brokerbot.txCount = brokerbot.txCount.plus(ONE_BI)
  brokerbot.reserveBase = brokerbotBaseBalance
  brokerbot.reserveToken = brokerbotTokenBalance
  brokerbot.basePrice = convertTokenToDecimal(event.params.newprice, base.decimals)
  if (brokerbot.basePrice.gt(ZERO_BD)) {
    brokerbot.tokenPrice = ONE_BD.div(brokerbot.basePrice)
  }
  brokerbot.priceXCHF = convertToChf(Address.fromString(base.id), brokerbot.basePrice)
  brokerbot.priceUSD = convertToUsd(base.id, brokerbot.basePrice)
  brokerbot.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), brokerbot.reserveBase.plus(brokerbot.reserveToken.times(brokerbot.basePrice)))
  brokerbot.totalValueLockedUSD = convertToUsd(base.id, brokerbot.reserveBase.plus(brokerbot.reserveToken.times(brokerbot.basePrice)))
  if (event.params.amount > ZERO_BI) {
    brokerbot.totalRaisedXCHF = brokerbot.totalRaisedXCHF.plus(amountXCHF)
    brokerbot.totalRaisedUSD = brokerbot.totalRaisedUSD.plus(amountUSD)
  } else {
    brokerbot.totalRaisedXCHF = brokerbot.totalRaisedXCHF.minus(amountXCHF)
    brokerbot.totalRaisedUSD = brokerbot.totalRaisedUSD.minus(amountUSD)
  }
  brokerbot.liquidityXCHF = convertToChf(Address.fromString(base.id), brokerbot.reserveBase)
  brokerbot.liquidityUSD = convertToUsd(base.id, brokerbot.reserveBase)

  // update base global volume and token liquidity stats
  base.derivedUSD = convertToUsd(base.id, base.derivedXCHF);
  base.tradeVolume = base.tradeVolume.plus(amountBase)
  base.tradeVolumeXCHF = base.tradeVolumeXCHF.plus(amountXCHF)
  base.tradeVolumeUSD = base.tradeVolumeUSD.plus(amountUSD)
  base.totalValueLocked = base.totalValueLocked.plus(brokerbotBaseBalance)
  base.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), base.totalValueLocked)
  base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)
  base.totalSupply = fetchTokenTotalSupply(event.params.base)

  // update token global volume and token liquidity stats
  token.tradeVolume = token.tradeVolume.plus(amountToken)
  token.tradeVolumeXCHF = token.tradeVolumeXCHF.plus(amountXCHF)
  token.tradeVolumeUSD = token.tradeVolumeUSD.plus(amountUSD)
  // only token tvl
  // token.totalValueLocked = token.totalValueLocked.plus(brokerbotTokenBalance)
  // token.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), token.totalValueLocked.times(brokerbot.basePrice))
  // token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(brokerbot.basePrice))
  // token+base currency tvl
  token.totalValueLocked = brokerbot.totalValueLockedXCHF.div(brokerbot.basePrice);
  token.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
  token.totalValueLockedUSD = brokerbot.totalValueLockedUSD
  if (event.params.amount > ZERO_BI) {
    token.totalRaisedXCHF = token.totalRaisedXCHF.plus(amountXCHF)
    token.totalRaisedUSD = token.totalRaisedUSD.plus(amountUSD)
  } else {
    token.totalRaisedXCHF = token.totalRaisedXCHF.minus(amountXCHF)
    token.totalRaisedUSD = token.totalRaisedUSD.minus(amountUSD)
  }
  token.liquidityXCHF = brokerbot.liquidityXCHF
  token.liquidityUSD = brokerbot.liquidityUSD
  token.totalSupply = fetchTokenTotalSupply(event.params.token)
  token.derivedXCHF = convertToChf(Address.fromString(base.id), brokerbot.basePrice)
  token.derivedUSD = convertToUsd(base.id, brokerbot.basePrice)
  token.totalShares = fetchTokenTotalShares(event.params.token)
  if(token.totalShares !== null) {
    token.marketCap = token.derivedXCHF.times(token.totalShares!.toBigDecimal())
  }
  // if token initial where given out with at price 0
  if (token.firstTradePriceXCHF == ZERO_BD){
    token.firstTradePriceXCHF = token.derivedXCHF
  }

  // update txn counts
  base.txCount = base.txCount.plus(ONE_BI)
  token.txCount = token.txCount.plus(ONE_BI)
  
  // update data of registry
  registry.txCount = registry.txCount.plus(ONE_BI)
  registry.totalVolumeXCHF = registry.totalVolumeXCHF.plus(amountBase)
  registry.totalVolumeUSD = convertToUsd(base.id, registry.totalVolumeXCHF)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(brokerbot.totalValueLockedXCHF)
  registry.totalValueLockedUSD = convertToUsd(base.id, registry.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.plus(brokerbot.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.plus(brokerbot.totalRaisedUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.plus(brokerbot.liquidityXCHF)
  registry.liquidityUSD = registry.liquidityUSD.plus(brokerbot.liquidityUSD)
  registry.lastUpdate = event.block.number

  // save entities
  registry.save()
  brokerbot.save()
  base.save()
  token.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.swaps = []
  }
  let swaps = transaction.swaps
  let swap = new SwapEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )

  // update swap event
  swap.transaction = transaction.id
  swap.brokerbot = brokerbot.id
  swap.token = token.id
  swap.base = base.id
  swap.timestamp = transaction.timestamp
  swap.sender = event.params.who
  swap.isBuy = event.params.amount > ZERO_BI
  swap.amountBase = amountBase
  swap.amountToken = amountToken
  swap.amountUSD = amountUSD
  swap.amountXCHF = amountXCHF
  swap.newPriceBase = convertTokenToDecimal(event.params.newprice, base.decimals)
  if (event.params.amount.abs().gt(ZERO_BI)) {
    swap.avgPriceBase = convertTokenToDecimal(event.params.totPrice.div(event.params.amount.abs()), base.decimals)
  }
  swap.newPriceUSD = convertToUsd(base.id, swap.newPriceBase)
  swap.avgPriceUSD = convertToUsd(base.id, swap.avgPriceBase)
  swap.newPriceXCHF = convertToChf(Address.fromString(base.id), swap.newPriceBase)
  swap.avgPriceXCHF = convertToChf(Address.fromString(base.id), swap.newPriceBase)
  swap.logIndex = event.logIndex
  swap.save()

  // update the transaction
  swaps!.push(swap.id)
  transaction.swaps = swaps
  transaction.save()

  // interval data
  updateAktionariatWeekData(event, swap)
  updateAktionariatDayData(event, swap)
  updateBrokerbotWeekData(event, swap)
  updateBrokerbotDayData(event, swap)
  updateBrokerbotHourData(event, swap)
  updateTokenWeekData(token, event, swap)
  updateTokenDayData(token, event, swap)
  updateTokenHourData(token, event, swap)
  updateTokenWeekData(base, event, swap)
  updateTokenDayData(base, event, swap)
  updateTokenHourData(base, event, swap)
}

// update brokerbot and token price if the price is manually changed in the brokerbot
export function handlePriceSet(event: PriceSet): void {
  const MARKET_ADDRESS = event.address.toHexString()
  let brokerbot = Brokerbot.load(MARKET_ADDRESS)
  if (brokerbot != null) {
    let token = Token.load(brokerbot.token)
    let base = Token.load(brokerbot.base)

    if (base !== null && token !== null) {      
      brokerbot.basePrice = convertTokenToDecimal(event.params.price, base.decimals)
      if (brokerbot.basePrice.gt(ZERO_BD)) {
        brokerbot.tokenPrice = ONE_BD.div(brokerbot.basePrice)
      }
      brokerbot.priceXCHF = convertToChf(Address.fromString(base.id), brokerbot.basePrice)
      brokerbot.priceUSD = convertToUsd(base.id, brokerbot.basePrice)

      base.derivedUSD = convertToUsd(base.id, base.derivedXCHF)
      token.derivedXCHF = convertToChf(Address.fromString(base.id), brokerbot.basePrice)
      token.derivedUSD = convertToUsd(base.id, brokerbot.basePrice)
      token.totalShares = fetchTokenTotalShares(Address.fromString(token.id))
      if(token.totalShares !== null) {
        token.marketCap = token.derivedXCHF.times(token.totalShares!.toBigDecimal())
      }   
      let marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(base.id), Address.fromString(brokerbot.id)), base.decimals)
      let marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token.id), Address.fromString(brokerbot.id)), token.decimals)
      brokerbot.totalValueLockedXCHF = marketBaseBalance.plus(marketTokenBalance.times(brokerbot.basePrice))
      brokerbot.totalValueLockedUSD = convertToUsd(base.id, brokerbot.totalValueLockedXCHF)

      brokerbot.save()
      token.save()
    }
  }
}
