# subgraph
Subgraph of the brokerbot/market data

# upgrade schema

If the the schema is updated the generated files needs to be updated
```
yarn codegen
```

# prepare subgraph
The networks mainnet and optimism are supported, to use the right yaml file to deploy you need to prepare the subgraph with the right template.

Mainnet
```
yarn prepare:mainnet
```
Optimism
```
yarn prepare:optimism
```

# deploy subgrah
After the preparation the subgraph is deploy with

Mainnet
```
yarn deploy
```
Optimism
```
yarn deploy-op
```
