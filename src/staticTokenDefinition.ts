import {
  Address,
  BigInt,
} from "@graphprotocol/graph-ts"
  
// Initialize a Token Definition with the attributes
export class StaticTokenDefinition {
  address : Address
  symbol: string
  name: string
  decimals: BigInt

  // Initialize a Token Definition with its attributes
  constructor(address: Address, symbol: string, name: string, decimals: BigInt) {
    this.address = address
    this.symbol = symbol
    this.name = name
    this.decimals = decimals
  }

  // Get all tokens with a static defintion
  static getStaticDefinitions(): Array<StaticTokenDefinition> {
    let staticDefinitions = new Array<StaticTokenDefinition>(6)

       // Add XCHF
       let tokenXCHF = new StaticTokenDefinition(
        Address.fromString('0xB4272071eCAdd69d933AdcD19cA99fe80664fc08'),
        'XCHF',
        'CryptoFranc',
        BigInt.fromI32(18)
      )
      staticDefinitions.push(tokenXCHF)
  
      // Add DAKS
      let tokenDAKS = new StaticTokenDefinition(
        Address.fromString('0x6f38e0f1a73c96cB3f42598613EA3474F09cB200'),
        'DAKS',
        'Draggable Aktionariat AG Shares ',
        BigInt.fromI32(0)
      )
      staticDefinitions.push(tokenDAKS)

    return staticDefinitions
  }

  // Helper for hardcoded tokens
  static fromAddress(tokenAddress: Address) : StaticTokenDefinition | null {
    let staticDefinitions = this.getStaticDefinitions()
    let tokenAddressHex = tokenAddress.toHexString()

    // Search the definition using the address
    for (let i = 0; i < staticDefinitions.length; i++) {
      let staticDefinition = staticDefinitions[i]
      if(staticDefinition.address.toHexString() == tokenAddressHex) {
        return staticDefinition
      }
    }

    // If not found, return null
    return null
  }

}