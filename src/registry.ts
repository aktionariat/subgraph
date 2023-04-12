import { Address } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  RegisterBrokerbot,
  SyncBrokerbot
} from "../generated/BrokerbotRegistry/BrokerbotRegistry"
import {   
  Pair,
  Token,
} from "../generated/schema"
import {
  fetchTokenBalance,
  convertTokenToDecimal,
  convertToUsd,
  getRegistry,
  getEntities,
  fetchBrokerbotBasePrice,
  ZERO_BD,
  ONE_BD,
} from './utils/helpers'

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const REGISTRY_ADDRESS = event.address.toHexString()
  const registry = getRegistry(REGISTRY_ADDRESS)
  registry.owner = event.params.newOwner.toHexString()
  registry.save()
}

export function handleRegisterBrokerbot(event: RegisterBrokerbot): void {
  const entities = getEntities(event.address, event.params.brokerbot, event.params.base, event.params.token)
  // save entities  
  entities.registry.save()
  entities.pair.save()
  entities.base.save()
  entities.token.save()
  
}


export function handleSyncBrokerbot(event: SyncBrokerbot): void {
  let registry = getRegistry(event.address.toHexString())
  let pair = Pair.load(event.params.brokerbot.toHexString())
  // only sync if brokerbot exists
  if (pair !== null) {
    let base = Token.load(pair.token1)
    let token = Token.load(pair.token0)
    if (base !== null && token !== null) {
      // get current market balance
      const marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(base.id), Address.fromString(pair.id)), base.decimals)
      const marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token.id), Address.fromString(pair.id)), token.decimals)

      // reset total liquidity amounts
      base.totalValueLocked = base.totalValueLocked.minus(pair.reserveToken1)
      token.totalValueLocked = token.totalValueLocked.minus(pair.reserveToken0)
      registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.minus(pair.totalValueLockedXCHF)

      // update stats
      base.totalValueLocked = base.totalValueLocked.plus(marketBaseBalance)
      base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)

      token.totalValueLocked = token.totalValueLocked.plus(marketTokenBalance)
      token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(pair.token1Price))

      pair.reserveToken1 = marketBaseBalance
      pair.reserveToken0 = marketTokenBalance
      pair.token1Price = convertTokenToDecimal(fetchBrokerbotBasePrice(Address.fromString(pair.id)), base.decimals)
      if (pair.token1Price.gt(ZERO_BD)) {
        pair.token0Price = ONE_BD.div(pair.token1Price)
      }
      pair.totalValueLockedXCHF = marketBaseBalance.plus(marketTokenBalance.times(pair.token1Price))
      pair.totalValueLockedUSD = convertToUsd(base.id, pair.totalValueLockedXCHF)

      registry.totalValueLockedXCHF = registry.totalValueLockedXCHF.plus(pair.totalValueLockedXCHF)
      registry.totalValueLockedUSD = convertToUsd(base.id, registry.totalValueLockedXCHF)

      // save entities
      registry.save()
      pair.save()
      base.save()
      token.save()
    }
  }

}
