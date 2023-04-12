import { Address, log} from "@graphprotocol/graph-ts"
import { Trade, PriceSet } from "../generated/templates/Brokerbot/Brokerbot"
import {   
  Registry,
  Pair,
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
import { updateAktionariatDayData, updateAktionariatWeekData, updatePairDayData, updatePairHourData, updatePairWeekData, updateTokenDayData, updateTokenHourData, updateTokenWeekData } from "./utils/intervalUpdates"

export function handleTrade(event: Trade): void {
  // load registry
  let registry = getRegistry(REGISTRY_ADDRESS.toHexString())

  // load brokerbot
  const BROKERBOT_ADDRESS = event.address.toHexString()
  let brokerbot = Pair.load(BROKERBOT_ADDRESS)
  if (brokerbot === null) {
    brokerbot = new Pair(BROKERBOT_ADDRESS)
    brokerbot.token1 = event.params.base.toHexString()
    brokerbot.token0 = event.params.token.toHexString()
    registry.marketCount = registry.marketCount.plus(ONE_BI)
  }

  // load the base currency
  let token1 = Token.load(brokerbot.token1)
  //fetch info if null
  if (token1 === null) {
    token1 = new Token(event.params.base.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.base)
    token1.name = fetchTokenName(event.params.base)
    token1.totalSupply = fetchTokenTotalSupply(event.params.base)
    token1.decimals = fetchTokenDecimals(event.params.base)

    token1.derivedXCHF = ONE_BD
    token1.derivedUSD = ONE_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.tradeVolumeXCHF = ZERO_BD
    token1.totalValueLocked = ZERO_BD
    token1.txCount = ZERO_BI
  }

  // load share token
  let token0 = Token.load(brokerbot.token0)
  //fetch info if null
  if (token0 === null) {
    token0 = new Token(event.params.token.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token)
    token0.name = fetchTokenName(event.params.token)
    token0.totalSupply = fetchTokenTotalSupply(event.params.token)
    token0.decimals = fetchTokenDecimals(event.params.token)
    token0.totalShares = fetchTokenTotalShares(event.params.token)

    token0.derivedXCHF = ZERO_BD
    token0.derivedUSD = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.tradeVolumeXCHF = ZERO_BD
    token0.totalValueLocked = ZERO_BD
    token0.totalValueLockedXCHF = ZERO_BD
    token0.totalValueLockedUSD = ZERO_BD
    token0.txCount = ZERO_BI
    token0.firstTradePriceXCHF = ZERO_BD

    // if there is a new token means new market on the registry
    registry.tokenCount = registry.tokenCount.plus(ONE_BI)
  }
  
  let amountToken1 = convertTokenToDecimal(event.params.totPrice, token1.decimals)
  let amountToken0 = convertTokenToDecimal(event.params.amount.abs(), token0.decimals)
  let amountUSD = convertToUsd(token1.id, amountToken1)
  let amountXCHF = convertToChf(Address.fromString(token1.id), amountToken1)

  // reset total liquidity amounts
  token1.totalValueLocked = token1.totalValueLocked.minus(brokerbot.reserveToken1)
  token0.totalValueLocked = token0.totalValueLocked.minus(brokerbot.reserveToken0)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(brokerbot.totalValueLockedXCHF)
  registry.totalValueLockedUSD = registry.totalValueLockedUSD.minus(brokerbot.totalValueLockedUSD)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.minus(brokerbot.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.minus(brokerbot.totalRaisedUSD)
  registry.liquidityUSD = registry.liquidityUSD.minus(brokerbot.liquidityUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.minus(brokerbot.liquidityXCHF)

  // get current brokerbot balance
  let brokerbotToken1Balance  = convertTokenToDecimal(fetchTokenBalance(event.params.base, Address.fromString(brokerbot.id)), token1.decimals)
  let brokerbotToken0Balance = convertTokenToDecimal(fetchTokenBalance(event.params.token, Address.fromString(brokerbot.id)), token0.decimals)
  
  
  // update brokerbot data
  brokerbot.volumeToken1 = brokerbot.volumeToken1.plus(amountToken1)
  brokerbot.volumeToken0= brokerbot.volumeToken0.plus(amountToken0)
  brokerbot.volumeUSD = brokerbot.volumeUSD.plus(amountUSD)
  brokerbot.volumeXCHF = brokerbot.volumeXCHF.plus(amountXCHF)
  brokerbot.txCount = brokerbot.txCount.plus(ONE_BI)
  brokerbot.reserveToken1 = brokerbotToken1Balance
  brokerbot.reserveToken0 = brokerbotToken0Balance
  brokerbot.token1Price = convertTokenToDecimal(event.params.newprice, token1.decimals)
  if (brokerbot.token1Price.gt(ZERO_BD)) {
    brokerbot.token0Price = ONE_BD.div(brokerbot.token1Price)
  }
  brokerbot.priceXCHF = convertToChf(Address.fromString(token1.id), brokerbot.token1Price)
  brokerbot.priceUSD = convertToUsd(token1.id, brokerbot.token1Price)
  brokerbot.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), brokerbot.reserveToken1.plus(brokerbot.reserveToken0.times(brokerbot.token1Price)))
  brokerbot.totalValueLockedUSD = convertToUsd(token1.id, brokerbot.reserveToken1.plus(brokerbot.reserveToken0.times(brokerbot.token1Price)))
  if (event.params.amount > ZERO_BI) {
    brokerbot.totalRaisedXCHF = brokerbot.totalRaisedXCHF.plus(amountXCHF)
    brokerbot.totalRaisedUSD = brokerbot.totalRaisedUSD.plus(amountUSD)
  } else {
    brokerbot.totalRaisedXCHF = brokerbot.totalRaisedXCHF.minus(amountXCHF)
    brokerbot.totalRaisedUSD = brokerbot.totalRaisedUSD.minus(amountUSD)
  }
  brokerbot.liquidityXCHF = convertToChf(Address.fromString(token1.id), brokerbot.reserveToken1)
  brokerbot.liquidityUSD = convertToUsd(token1.id, brokerbot.reserveToken1)

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amountToken1)
  token1.tradeVolumeXCHF = token1.tradeVolumeXCHF.plus(amountXCHF)
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(amountUSD)
  token1.totalValueLocked = token1.totalValueLocked.plus(brokerbotToken1Balance)
  token1.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), token1.totalValueLocked)
  token1.totalValueLockedUSD = convertToUsd(token1.id, token1.totalValueLocked)
  token1.totalSupply = fetchTokenTotalSupply(event.params.base)

  // update token global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amountToken0)
  token0.tradeVolumeXCHF = token0.tradeVolumeXCHF.plus(amountXCHF)
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(amountUSD)
  token0.totalValueLocked = token0.totalValueLocked.plus(brokerbotToken0Balance)
  token0.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), token0.totalValueLocked.times(brokerbot.token1Price))
  token0.totalValueLockedUSD = convertToUsd(token1.id, token0.totalValueLocked.times(brokerbot.token1Price))
  if (event.params.amount > ZERO_BI) {
    token0.totalRaisedXCHF = token0.totalRaisedXCHF.plus(amountXCHF)
    token0.totalRaisedUSD = token0.totalRaisedUSD.plus(amountUSD)
  } else {
    token0.totalRaisedXCHF = token0.totalRaisedXCHF.minus(amountXCHF)
    token0.totalRaisedUSD = token0.totalRaisedUSD.minus(amountUSD)
  }
  token0.liquidityXCHF = brokerbot.liquidityXCHF
  token0.liquidityUSD = brokerbot.liquidityUSD
  token0.totalSupply = fetchTokenTotalSupply(event.params.token)
  token0.derivedXCHF = convertToChf(Address.fromString(token1.id), brokerbot.token1Price)
  token0.derivedUSD = convertToUsd(token1.id, brokerbot.token1Price)
  token0.totalShares = fetchTokenTotalShares(event.params.token)
  if(token0.totalShares !== null) {
    token0.marketCap = token0.derivedXCHF.times(token0.totalShares!.toBigDecimal())
  }
  // if token initial where given out with at price 0
  if (token0.firstTradePriceXCHF == ZERO_BD){
    token0.firstTradePriceXCHF = token0.derivedXCHF
  }

  // update txn counts
  token1.txCount = token1.txCount.plus(ONE_BI)
  token0.txCount = token0.txCount.plus(ONE_BI)
  
  // update data of registry
  registry.txCount = registry.txCount.plus(ONE_BI)
  registry.totalVolumeXCHF = registry.totalVolumeXCHF.plus(amountToken1)
  registry.totalVolumeUSD = convertToUsd(token1.id, registry.totalVolumeXCHF)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(brokerbot.totalValueLockedXCHF)
  registry.totalValueLockedUSD = convertToUsd(token1.id, registry.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.plus(brokerbot.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.plus(brokerbot.totalRaisedUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.plus(brokerbot.liquidityXCHF)
  registry.liquidityUSD = registry.liquidityUSD.plus(brokerbot.liquidityUSD)
  registry.lastUpdate = event.block.number

  // save entities
  registry.save()
  brokerbot.save()
  token1.save()
  token0.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
  }
  let swap = new SwapEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )

  // update swap event
  swap.transaction = transaction.id
  swap.pair = brokerbot.id
  swap.token0 = token0.id
  swap.token1 = token1.id
  swap.timestamp = transaction.timestamp
  swap.sender = event.params.who
  swap.isBuy = event.params.amount > ZERO_BI
  swap.amountToken1 = amountToken1
  swap.amountToken0 = amountToken0
  swap.amountUSD = amountUSD
  swap.amountXCHF = amountXCHF
  swap.newPriceToken1 = convertTokenToDecimal(event.params.newprice, token1.decimals)
  if (event.params.amount.abs().gt(ZERO_BI)) {
    swap.avgPriceToken1 = convertTokenToDecimal(event.params.totPrice.div(event.params.amount.abs()), token1.decimals)
  }
  swap.newPriceUSD = convertToUsd(token1.id, swap.newPriceToken1)
  swap.avgPriceUSD = convertToUsd(token1.id, swap.avgPriceToken1)
  swap.newPriceXCHF = convertToChf(Address.fromString(token1.id), swap.newPriceToken1)
  swap.avgPriceXCHF = convertToChf(Address.fromString(token1.id), swap.newPriceToken1)
  swap.logIndex = event.logIndex
  swap.save()

  // update the transaction
  transaction.swap = swap.id
  transaction.save()

  // interval data
  updateAktionariatWeekData(event, swap)
  updateAktionariatDayData(event, swap)
  updatePairWeekData(event, swap)
  updatePairDayData(event, swap)
  updatePairHourData(event, swap)
  updateTokenWeekData(token0, event, swap)
  updateTokenDayData(token0, event, swap)
  updateTokenHourData(token0, event, swap)
  updateTokenWeekData(token1, event, swap)
  updateTokenDayData(token1, event, swap)
  updateTokenHourData(token1, event, swap)
}

// update brokerbot and token price if the price is manually changed in the brokerbot
export function handlePriceSet(event: PriceSet): void {
  const MARKET_ADDRESS = event.address.toHexString()
  let brokerbot = Pair.load(MARKET_ADDRESS)
  if (brokerbot != null) {
    let token0 = Token.load(brokerbot.token0)
    let token1 = Token.load(brokerbot.token1)

    if (token1 !== null && token0 !== null) {      
      brokerbot.token1Price = convertTokenToDecimal(event.params.price, token1.decimals)
      if (brokerbot.token1Price.gt(ZERO_BD)) {
        brokerbot.token0Price = ONE_BD.div(brokerbot.token1Price)
      }
      brokerbot.priceXCHF = convertToChf(Address.fromString(token1.id), brokerbot.token1Price)
      brokerbot.priceUSD = convertToUsd(token1.id, brokerbot.token1Price)

      token0.derivedXCHF = convertToChf(Address.fromString(token1.id), brokerbot.token1Price)
      token0.derivedUSD = convertToUsd(token1.id, brokerbot.token1Price)
      token0.totalShares = fetchTokenTotalShares(Address.fromString(token0.id))
      if(token0.totalShares !== null) {
        token0.marketCap = token0.derivedXCHF.times(token0.totalShares!.toBigDecimal())
      }   
      let marketToken1Balance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token1.id), Address.fromString(brokerbot.id)), token1.decimals)
      let marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token0.id), Address.fromString(brokerbot.id)), token0.decimals)
      brokerbot.totalValueLockedXCHF = marketToken1Balance.plus(marketTokenBalance.times(brokerbot.token1Price))
      brokerbot.totalValueLockedUSD = convertToUsd(token1.id, brokerbot.totalValueLockedXCHF)

      brokerbot.save()
      token0.save()
    }
  }
}
