import { Address, log} from "@graphprotocol/graph-ts"
import {
  Trade
} from "../generated/Brokerbot/Brokerbot"
import {   
  Registry,
  Market,
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
  convertTokenToDecimal,
  convertToUsd,
  REGISTRY_ADDRESS,
  OWNER_ADDRESS,
  ONE_BD,
  getRegistry
} from './helpers'

export function handleTrade(event: Trade): void {
  // load registry
  let registry = getRegistry(REGISTRY_ADDRESS.toHexString())

  // load market
  const MARKET_ADDRESS = event.address.toHexString()
  let market = Market.load(MARKET_ADDRESS)
  if (market === null) {
    market = new Market(MARKET_ADDRESS)
    market.base = event.params.base.toHexString()
    market.token = event.params.token.toHexString()
    registry.marketCount = registry.marketCount.plus(ONE_BI)
  }

  // load the tokens
  let base = Token.load(market.base)
  let token = Token.load(market.token)

  //fetch info if null
  if (base === null) {
    base = new Token(event.params.base.toHexString())
    base.symbol = fetchTokenSymbol(event.params.base)
    base.name = fetchTokenName(event.params.base)
    base.totalSupply = fetchTokenTotalSupply(event.params.base)
    base.decimals = fetchTokenDecimals(event.params.base)

    base.derivedETH = ZERO_BD
    base.tradeVolume = ZERO_BD
    base.tradeVolumeUSD = ZERO_BD
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

    token.derivedETH = ZERO_BD
    token.tradeVolume = ZERO_BD
    token.tradeVolumeUSD = ZERO_BD
    token.totalValueLocked = ZERO_BD
    token.txCount = ZERO_BI
  }
  
  let amountBase = convertTokenToDecimal(event.params.totPrice, base.decimals)
  let amountToken = convertTokenToDecimal(event.params.amount.abs(), token.decimals)
  let amountUSD = convertToUsd(base.id, amountBase)

  // reset total liquidity amounts
  base.totalValueLocked = base.totalValueLocked.minus(market.reserveBase)
  token.totalValueLocked = token.totalValueLocked.minus(market.reserveToken)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(market.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.minus(market.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.minus(market.totalRaisedUSD)

  // get current market balance
  let marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(event.params.base, Address.fromString(market.id)), base.decimals)
  let marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(event.params.token, Address.fromString(market.id)), token.decimals)

  // update base global volume and token liquidity stats
  base.tradeVolume = base.tradeVolume.plus(amountBase)
  base.tradeVolumeUSD = base.tradeVolumeUSD.plus(amountUSD)
  base.totalValueLocked = base.totalValueLocked.plus(marketBaseBalance)
  base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)

  // update token global volume and token liquidity stats
  token.tradeVolume = token.tradeVolume.plus(amountToken)
  token.tradeVolumeUSD = base.tradeVolumeUSD.plus(amountUSD)
  token.totalValueLocked = token.totalValueLocked.plus(marketTokenBalance)
  token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(market.basePrice))

  // update txn counts
  base.txCount = base.txCount.plus(ONE_BI)
  token.txCount = token.txCount.plus(ONE_BI)

  
  // update market data
  market.volumeBase = market.volumeBase.plus(amountBase)
  market.volumeToken = market.volumeToken.plus(amountToken)
  market.volumeUSD = market.volumeUSD.plus(amountUSD)
  market.txCount = market.txCount.plus(ONE_BI)
  market.reserveBase = marketBaseBalance
  market.reserveToken = marketTokenBalance
  market.basePrice = convertTokenToDecimal(event.params.newprice, base.decimals)
  market.tokenPrice = ONE_BD.div(market.basePrice)
  market.totalValueLockedXCHF = marketBaseBalance.plus(marketTokenBalance.times(market.basePrice))
  market.totalValueLockedUSD = convertToUsd(base.id, market.totalValueLockedXCHF)
  if (event.params.amount > ZERO_BI) {
    market.totalRaisedXCHF = market.totalRaisedXCHF.plus(amountBase)
    market.totalRaisedUSD = market.totalRaisedUSD.plus(convertToUsd(base.id, amountBase))
  }
  
  // update data of registry
  registry.txCount = registry.txCount.plus(ONE_BI)
  registry.totalVolumeXCHF = registry.totalVolumeXCHF.plus(amountBase)
  registry.totalVolumeUSD = convertToUsd(base.id, registry.totalVolumeXCHF)
  registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(market.totalValueLockedXCHF)
  registry.totalValueLockedUSD = convertToUsd(base.id, registry.totalValueLockedXCHF)
  registry.totalRaisedXCHF = registry.totalRaisedXCHF.plus(market.totalRaisedXCHF)
  registry.totalRaisedUSD = registry.totalRaisedUSD.plus(market.totalRaisedUSD)

  // save entities
  registry.save()
  market.save()
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
  swap.market = market.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
  swap.sender = event.params.who
  swap.amountBase = amountBase
  swap.amountToken = amountToken
  swap.amountUSD = amountUSD
  swap.newPriceBase = convertTokenToDecimal(event.params.newprice, base.decimals)
  swap.avgPriceBase = convertTokenToDecimal(event.params.totPrice.div(event.params.amount.abs()), base.decimals)
  swap.newPriceUSD = convertToUsd(base.id, swap.newPriceBase)
  swap.avgPriceUSD = convertToUsd(base.id, swap.avgPriceBase)
  swap.logIndex = event.logIndex
  swap.save()

  // update the transaction
  transaction.swap = swap.id
  transaction.save()

}
