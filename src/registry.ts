import { Address } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  RegisterBrokerbot,
  SyncBrokerbot
} from "../generated/BrokerbotRegistry/BrokerbotRegistry"
import {   
  Registry,
  Market,
  Token,
  Transaction
} from "../generated/schema"
import {
  fetchTokenBalance,
  convertTokenToDecimal,
  convertToUsd,
  getRegistry,
  getEntities,
  Entities
} from './helpers'

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const REGISTRY_ADDRESS = event.address.toHexString()
  const registry = getRegistry(REGISTRY_ADDRESS)
  registry.owner = event.params.newOwner.toHexString()
  registry.save()
}

export function handleRegisterBrokerbot(event: RegisterBrokerbot): void {
  const entities = getEntities(event.address, event.params.brokerbot, event.params.base, event.params.token)
  // save entities
  //registry.save()
  //market.save()
  //base.save()
  //token.save()
  
  entities.registry.save()
  entities.market.save()
  entities.base.save()
  entities.token.save()
  
}


export function handleSyncBrokerbot(event: SyncBrokerbot): void {
  let registry = getRegistry(event.address.toHexString())
  let market = Market.load(event.params.brokerbot.toHexString())
  // only sync if brokerbot exists
  if (market !== null) {
    let base = Token.load(market.base)
    let token = Token.load(market.token)
    if (base !== null && token !== null) {
      // get current market balance
      const marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(base.id), Address.fromString(market.id)), base.decimals)
      const marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token.id), Address.fromString(market.id)), token.decimals)

      // reset total liquidity amounts
      base.totalValueLocked = base.totalValueLocked.minus(market.reserveBase)
      token.totalValueLocked = token.totalValueLocked.minus(market.reserveToken)
      registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(market.totalValueLockedXCHF)

      // update stats
      base.totalValueLocked = base.totalValueLocked.plus(marketBaseBalance)
      base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)

      token.totalValueLocked = token.totalValueLocked.plus(marketTokenBalance)
      token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(market.basePrice))

      market.reserveBase = marketBaseBalance
      market.reserveToken = marketTokenBalance
      market.totalValueLockedXCHF = marketBaseBalance.plus(marketTokenBalance.times(market.basePrice))
      market.totalValueLockedUSD = convertToUsd(base.id, market.totalValueLockedXCHF)

      registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(market.totalValueLockedXCHF)
      registry.totalValueLockedUSD = convertToUsd(base.id, registry.totalValueLockedXCHF)

      // save entities
      registry.save()
      market.save()
      base.save()
      token.save()
    }
  }

}
