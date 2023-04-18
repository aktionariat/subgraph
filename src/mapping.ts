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

  // load pair
  const PAIR_ADDRESS = event.address.toHexString()
  let pair = Pair.load(PAIR_ADDRESS)
  if (pair === null) {
    pair = new Pair(PAIR_ADDRESS)
    pair.token1 = event.params.base.toHexString()
    pair.token0 = event.params.token.toHexString()
    pair.createdAtTimestamp = event.block.timestamp
    pair.createdAtBlockNumber = event.block.number
    registry.pairCount = registry.pairCount.plus(ONE_BI)
  }

  // load the base currency
  let token1 = Token.load(pair.token1)
  //fetch info if null
  if (token1 === null) {
    token1 = new Token(event.params.base.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.base)
    token1.name = fetchTokenName(event.params.base)
    token1.totalSupply = fetchTokenTotalSupply(event.params.base)
    token1.decimals = fetchTokenDecimals(event.params.base)

    token1.derivedXCHF = ONE_BD
    token1.derivedUSD = convertToUsd(token1.id, token1.derivedXCHF);
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.tradeVolumeXCHF = ZERO_BD
    token1.totalValueLocked = ZERO_BD
    token1.txCount = ZERO_BI
    token1.firstTradeTimestamp = ZERO_BI
    token1.firstTradeBlock = ZERO_BI
  }

  // load share token
  let token0 = Token.load(pair.token0)
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
    token0.firstTradeTimestamp = ZERO_BI
    token0.firstTradeBlock = ZERO_BI

    // if there is a new token means new market on the registry
    registry.tokenCount = registry.tokenCount.plus(ONE_BI)
  }
  
  let amountToken1 = convertTokenToDecimal(event.params.totPrice, token1.decimals)
  let amountToken0 = convertTokenToDecimal(event.params.amount.abs(), token0.decimals)
  let amountUSD = convertToUsd(token1.id, amountToken1)
  let amountXCHF = convertToChf(Address.fromString(token1.id), amountToken1)

  // reset total liquidity amounts
  token1.totalValueLocked = token1.totalValueLocked.minus(pair.reserveToken1)
  token0.totalValueLocked = token0.totalValueLocked.minus(pair.reserveToken0)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(pair.totalValueLockedXCHF)
  registry.totalValueLockedUSD = registry.totalValueLockedUSD.minus(pair.totalValueLockedUSD)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.minus(pair.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.minus(pair.totalRaisedUSD)
  registry.liquidityUSD = registry.liquidityUSD.minus(pair.liquidityUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.minus(pair.liquidityXCHF)

  // get current pair balance
  let pairToken1Balance  = convertTokenToDecimal(fetchTokenBalance(event.params.base, Address.fromString(pair.id)), token1.decimals)
  let pairToken0Balance = convertTokenToDecimal(fetchTokenBalance(event.params.token, Address.fromString(pair.id)), token0.decimals)
  
  
  // update pair data
  pair.volumeToken1 = pair.volumeToken1.plus(amountToken1)
  pair.volumeToken0= pair.volumeToken0.plus(amountToken0)
  pair.volumeUSD = pair.volumeUSD.plus(amountUSD)
  pair.volumeXCHF = pair.volumeXCHF.plus(amountXCHF)
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.reserveToken1 = pairToken1Balance
  pair.reserveToken0 = pairToken0Balance
  pair.token1Price = convertTokenToDecimal(event.params.newprice, token1.decimals)
  if (pair.token1Price.gt(ZERO_BD)) {
    pair.token0Price = ONE_BD.div(pair.token1Price)
  }
  pair.priceXCHF = convertToChf(Address.fromString(token1.id), pair.token1Price)
  pair.priceUSD = convertToUsd(token1.id, pair.token1Price)
  pair.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), pair.reserveToken1.plus(pair.reserveToken0.times(pair.token1Price)))
  pair.totalValueLockedUSD = convertToUsd(token1.id, pair.reserveToken1.plus(pair.reserveToken0.times(pair.token1Price)))
  if (event.params.amount > ZERO_BI) {
    pair.totalRaisedXCHF = pair.totalRaisedXCHF.plus(amountXCHF)
    pair.totalRaisedUSD = pair.totalRaisedUSD.plus(amountUSD)
  } else {
    pair.totalRaisedXCHF = pair.totalRaisedXCHF.minus(amountXCHF)
    pair.totalRaisedUSD = pair.totalRaisedUSD.minus(amountUSD)
  }
  pair.liquidityXCHF = convertToChf(Address.fromString(token1.id), pair.reserveToken1)
  pair.liquidityUSD = convertToUsd(token1.id, pair.reserveToken1)

  // update token1 global volume and token liquidity stats
  token1.derivedUSD = convertToUsd(token1.id, token1.derivedXCHF);
  token1.tradeVolume = token1.tradeVolume.plus(amountToken1)
  token1.tradeVolumeXCHF = token1.tradeVolumeXCHF.plus(amountXCHF)
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(amountUSD)
  token1.totalValueLocked = token1.totalValueLocked.plus(pairToken1Balance)
  token1.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), token1.totalValueLocked)
  token1.totalValueLockedUSD = convertToUsd(token1.id, token1.totalValueLocked)
  token1.totalSupply = fetchTokenTotalSupply(event.params.base)

  // update token global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amountToken0)
  token0.tradeVolumeXCHF = token0.tradeVolumeXCHF.plus(amountXCHF)
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(amountUSD)
  token0.totalValueLocked = token0.totalValueLocked.plus(pairToken0Balance)
  token0.totalValueLockedXCHF = convertToChf(Address.fromString(token1.id), token0.totalValueLocked.times(pair.token1Price))
  token0.totalValueLockedUSD = convertToUsd(token1.id, token0.totalValueLocked.times(pair.token1Price))
  if (event.params.amount > ZERO_BI) {
    token0.totalRaisedXCHF = token0.totalRaisedXCHF.plus(amountXCHF)
    token0.totalRaisedUSD = token0.totalRaisedUSD.plus(amountUSD)
  } else {
    token0.totalRaisedXCHF = token0.totalRaisedXCHF.minus(amountXCHF)
    token0.totalRaisedUSD = token0.totalRaisedUSD.minus(amountUSD)
  }
  token0.liquidityXCHF = pair.liquidityXCHF
  token0.liquidityUSD = pair.liquidityUSD
  token0.totalSupply = fetchTokenTotalSupply(event.params.token)
  token0.derivedXCHF = convertToChf(Address.fromString(token1.id), pair.token1Price)
  token0.derivedUSD = convertToUsd(token1.id, pair.token1Price)
  token0.totalShares = fetchTokenTotalShares(event.params.token)
  if(token0.totalShares !== null) {
    token0.marketCap = token0.derivedXCHF.times(token0.totalShares!.toBigDecimal())
  }
  // if token initial where given out with at price 0
  if (token0.firstTradePriceXCHF == ZERO_BD){
    token0.firstTradePriceXCHF = token0.derivedXCHF
  }

  // first trade init
  if (token0.firstTradeTimestamp == ZERO_BI) {
    token0.firstTradeTimestamp = event.block.timestamp
    token0.firstTradeBlock = event.block.number
  }
  if (token1.firstTradeTimestamp == ZERO_BI) {
    token1.firstTradeTimestamp = event.block.timestamp
    token1.firstTradeBlock = event.block.number
  }

  // update txn counts
  token1.txCount = token1.txCount.plus(ONE_BI)
  token0.txCount = token0.txCount.plus(ONE_BI)
  
  // update data of registry
  registry.txCount = registry.txCount.plus(ONE_BI)
  registry.totalVolumeXCHF = registry.totalVolumeXCHF.plus(amountToken1)
  registry.totalVolumeUSD = convertToUsd(token1.id, registry.totalVolumeXCHF)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(pair.totalValueLockedXCHF)
  registry.totalValueLockedUSD = convertToUsd(token1.id, registry.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.plus(pair.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.plus(pair.totalRaisedUSD)
  registry.liquidityXCHF = registry.liquidityXCHF.plus(pair.liquidityXCHF)
  registry.liquidityUSD = registry.liquidityUSD.plus(pair.liquidityUSD)
  registry.lastUpdate = event.block.number

  // save entities
  registry.save()
  pair.save()
  token1.save()
  token0.save()

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
  swap.pair = pair.id
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
  swaps!.push(swap.id)
  transaction.swaps = swaps
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

// update pair and token price if the price is manually changed in the pair
export function handlePriceSet(event: PriceSet): void {
  const MARKET_ADDRESS = event.address.toHexString()
  let pair = Pair.load(MARKET_ADDRESS)
  if (pair != null) {
    let token0 = Token.load(pair.token0)
    let token1 = Token.load(pair.token1)

    if (token1 !== null && token0 !== null) {      
      pair.token1Price = convertTokenToDecimal(event.params.price, token1.decimals)
      if (pair.token1Price.gt(ZERO_BD)) {
        pair.token0Price = ONE_BD.div(pair.token1Price)
      }
      pair.priceXCHF = convertToChf(Address.fromString(token1.id), pair.token1Price)
      pair.priceUSD = convertToUsd(token1.id, pair.token1Price)

      token1.derivedUSD = convertToUsd(token1.id, token1.derivedXCHF);
      token0.derivedXCHF = convertToChf(Address.fromString(token1.id), pair.token1Price)
      token0.derivedUSD = convertToUsd(token1.id, pair.token1Price)
      token0.totalShares = fetchTokenTotalShares(Address.fromString(token0.id))
      if(token0.totalShares !== null) {
        token0.marketCap = token0.derivedXCHF.times(token0.totalShares!.toBigDecimal())
      }   
      let marketToken1Balance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token1.id), Address.fromString(pair.id)), token1.decimals)
      let marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token0.id), Address.fromString(pair.id)), token0.decimals)
      pair.totalValueLockedXCHF = marketToken1Balance.plus(marketTokenBalance.times(pair.token1Price))
      pair.totalValueLockedUSD = convertToUsd(token1.id, pair.totalValueLockedXCHF)

      pair.save()
      token0.save()
    }
  }
}
