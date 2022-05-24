import { Address, TypedMap } from "@graphprotocol/graph-ts";

export const NETWORK_STRING = "optimism";

///////////////////////////////////////////////////////////////////////////
///////////////////////////// UNISWAP CONTRACT ////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const UNISWAP_QUOTER_CONTRACT_ADDRESSES = Address.fromString(
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// CHAINLINK CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const CHAIN_LINK_CONTRACT_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////////// HELPERS /////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const WHITELIST_TOKENS = new TypedMap<string, Address>();
WHITELIST_TOKENS.set(
  "WETH",
  Address.fromString("0x4200000000000000000000000000000000000006")
);
WHITELIST_TOKENS.set(
  "ETH",
  Address.fromString("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")
);
WHITELIST_TOKENS.set(
  "USDT",
  Address.fromString("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58")
);
WHITELIST_TOKENS.set(
  "DAI",
  Address.fromString("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1")
);
WHITELIST_TOKENS.set(
  "USDC",
  Address.fromString("0x7F5c764cBc14f9669B88837ca1490cCa17c31607")
);
WHITELIST_TOKENS.set(
  "WBTC",
  Address.fromString("0x68f180fcCe6836688e9084f035309E29Bf0A2095")
);
WHITELIST_TOKENS.set(
  "LINK",
  Address.fromString("0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6")
);
WHITELIST_TOKENS.set(
  "CRV",
  Address.fromString("0x0000000000000000000000000000000000000000")
);
