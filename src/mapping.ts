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
import { updateAktionariatDayData, updateBrokerbotDayData, updateBrokerbotHourData, updateTokenDayData, updateTokenHourData } from "./utils/intervalUpdates"

export function handleTrade(event: Trade): void {
  // load registry
  let registry = getRegistry(REGISTRY_ADDRESS.toHexString())

  // load market
  const MARKET_ADDRESS = event.address.toHexString()
  let brokerbot = Brokerbot.load(MARKET_ADDRESS)
  if (brokerbot === null) {
    brokerbot = new Brokerbot(MARKET_ADDRESS)
    brokerbot.base = event.params.base.toHexString()
    brokerbot.token = event.params.token.toHexString()
    registry.marketCount = registry.marketCount.plus(ONE_BI)
  }

  // load the tokens
  let base = Token.load(brokerbot.base)
  let token = Token.load(brokerbot.token)

  //fetch info if null
  if (base === null) {
    base = new Token(event.params.base.toHexString())
    base.symbol = fetchTokenSymbol(event.params.base)
    base.name = fetchTokenName(event.params.base)
    base.totalSupply = fetchTokenTotalSupply(event.params.base)
    base.decimals = fetchTokenDecimals(event.params.base)

    base.derivedXCHF = ONE_BD
    base.derivedUSD = ONE_BD
    base.tradeVolume = ZERO_BD
    base.tradeVolumeUSD = ZERO_BD
    base.tradeVolumeXCHF = ZERO_BD
    base.totalValueLocked = ZERO_BD
    base.txCount = ZERO_BI
  }

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
  }
  
  let amountBase = convertTokenToDecimal(event.params.totPrice, base.decimals)
  let amountToken = convertTokenToDecimal(event.params.amount.abs(), token.decimals)
  let amountUSD = convertToUsd(base.id, amountBase)
  let amountXCHF = convertToChf(Address.fromString(base.id), amountBase)

  // reset total liquidity amounts
  base.totalValueLocked = base.totalValueLocked.minus(brokerbot.reserveBase)
  token.totalValueLocked = token.totalValueLocked.minus(brokerbot.reserveToken)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(brokerbot.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.minus(brokerbot.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.minus(brokerbot.totalRaisedUSD)

  // get current market balance
  let marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(event.params.base, Address.fromString(brokerbot.id)), base.decimals)
  let marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(event.params.token, Address.fromString(brokerbot.id)), token.decimals)
  
  
  // update market data
  brokerbot.volumeBase = brokerbot.volumeBase.plus(amountBase)
  brokerbot.volumeToken = brokerbot.volumeToken.plus(amountToken)
  brokerbot.volumeUSD = brokerbot.volumeUSD.plus(amountUSD)
  brokerbot.volumeXCHF = brokerbot.volumeXCHF.plus(amountXCHF)
  brokerbot.txCount = brokerbot.txCount.plus(ONE_BI)
  brokerbot.reserveBase = marketBaseBalance
  brokerbot.reserveToken = marketTokenBalance
  brokerbot.basePrice = convertTokenToDecimal(event.params.newprice, base.decimals)
  if (brokerbot.basePrice.gt(ZERO_BD)) {
    brokerbot.tokenPrice = ONE_BD.div(brokerbot.basePrice)
  }
  brokerbot.priceXCHF = convertToChf(Address.fromString(base.id), brokerbot.basePrice)
  brokerbot.priceUSD = convertToUsd(base.id, brokerbot.basePrice)
  brokerbot.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), marketBaseBalance.plus(marketTokenBalance.times(brokerbot.basePrice)))
  brokerbot.totalValueLockedUSD = convertToUsd(base.id, brokerbot.totalValueLockedXCHF)
  if (event.params.amount > ZERO_BI) {
    brokerbot.totalRaisedXCHF = brokerbot.totalRaisedXCHF.plus(amountXCHF)
    brokerbot.totalRaisedUSD = brokerbot.totalRaisedUSD.plus(amountUSD)
  }

  // update base global volume and token liquidity stats
  base.tradeVolume = base.tradeVolume.plus(amountBase)
  base.tradeVolumeXCHF = base.tradeVolumeXCHF.plus(amountXCHF)
  base.tradeVolumeUSD = base.tradeVolumeUSD.plus(amountUSD)
  base.totalValueLocked = base.totalValueLocked.plus(marketBaseBalance)
  base.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), base.totalValueLocked)
  base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)
  base.totalSupply = fetchTokenTotalSupply(event.params.base)

  // update token global volume and token liquidity stats
  token.tradeVolume = token.tradeVolume.plus(amountToken)
  token.tradeVolumeXCHF = token.tradeVolumeXCHF.plus(amountXCHF)
  token.tradeVolumeUSD = token.tradeVolumeUSD.plus(amountUSD)
  token.totalValueLocked = token.totalValueLocked.plus(marketTokenBalance)
  token.totalValueLockedXCHF = convertToChf(Address.fromString(base.id), token.totalValueLocked.times(brokerbot.basePrice))
  token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(brokerbot.basePrice))

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
  }
  let swap = new SwapEvent(
    event.transaction.hash
      .toHexString()
  )

  // update swap event
  swap.transaction = transaction.id
  swap.brokerbot = brokerbot.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
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
  swap.logIndex = event.logIndex
  swap.save()

  // update the transaction
  transaction.swap = swap.id
  transaction.save()

  // interval data
  let aktionariatDayData = updateAktionariatDayData(event)
  let brokerbotDayData = updateBrokerbotDayData(event)
  let brokerbotHourData = updateBrokerbotHourData(event)
  let tokenDayData = updateTokenDayData(token, event)
  let baseDayData = updateTokenDayData(base, event)
  let tokenHourData = updateTokenHourData(token, event)
  let baseHourData = updateTokenHourData(base, event)

  // update volume metrics
  aktionariatDayData.volumeXCHF = aktionariatDayData.volumeXCHF.plus(amountXCHF)
  aktionariatDayData.volumeUSD = aktionariatDayData.volumeUSD.plus(amountUSD)

  brokerbotDayData.volumeBase = brokerbotDayData.volumeBase.plus(amountBase)
  brokerbotDayData.volumeToken = brokerbotDayData.volumeToken.plus(amountToken)
  brokerbotDayData.volumeUSD = brokerbotDayData.volumeUSD.plus(amountUSD)
  brokerbotDayData.volumeXCHF = brokerbotDayData.volumeXCHF.plus(amountXCHF)

  brokerbotHourData.volumeBase = brokerbotHourData.volumeBase.plus(amountBase)
  brokerbotHourData.volumeToken = brokerbotHourData.volumeToken.plus(amountToken)
  brokerbotHourData.volumeUSD = brokerbotHourData.volumeUSD.plus(amountUSD)
  brokerbotHourData.volumeXCHF = brokerbotHourData.volumeXCHF.plus(amountXCHF)

  tokenDayData.volume = tokenDayData.volume.plus(amountToken)
  tokenDayData.volumeUSD = tokenDayData.volumeUSD.plus(amountUSD)
  tokenDayData.volumeXCHF = tokenDayData.volumeXCHF.plus(amountXCHF)

  baseDayData.volume = baseDayData.volume.plus(amountBase)
  baseDayData.volumeUSD = baseDayData.volumeUSD.plus(amountUSD)
  baseDayData.volumeXCHF = baseDayData.volumeXCHF.plus(amountXCHF)

  tokenHourData.volume = tokenHourData.volume.plus(amountToken)
  tokenHourData.volumeUSD = tokenHourData.volumeUSD.plus(amountUSD)
  tokenHourData.volumeXCHF = tokenHourData.volumeXCHF.plus(amountXCHF)

  baseHourData.volume = baseHourData.volume.plus(amountBase)
  baseHourData.volumeUSD = baseHourData.volumeUSD.plus(amountUSD)
  baseHourData.volumeXCHF = baseHourData.volumeXCHF.plus(amountXCHF)

  // save
  aktionariatDayData.save()
  brokerbotDayData.save()
  brokerbotHourData.save()
  tokenDayData.save()
  tokenHourData.save()

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
