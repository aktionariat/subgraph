# Subgraph
Subgraph of the brokerbot/market data

# Upgrade schema

If the the schema is updated the generated files needs to be updated
```
yarn codegen
```

# Prepare Subgraph
The networks mainnet and optimism are supported, to use the right yaml file to deploy you need to prepare the subgraph with the right template.

Mainnet
```
yarn prepare:mainnet
```
Optimism
```
yarn prepare:optimism
```

# Deploy Subgraph
To get an access token of the Graph hosted service read their doc here https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-hosted/

After the preparation of the subgraph and linking your access token, you can deploy with

Mainnet
```
yarn deploy
```
Optimism
```
yarn deploy-op
```
