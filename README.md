# Solana Fees

### Development

Following services are used to fetch the data:

- Helius for transaction history
- Birdeye for token prices
- QuickNode GraphQL for gas prices
- Dune for gas usage / Tx
- Vercel KV to cache gas data


I. Install dependencies
```
npm install
```

II. Create an `.env.local` file in the project route and add the sercrets of the services
```
BIRDEYE_KEY=12345
DUNE_KEY=12345
HELIUS_KEY=12345
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=12345
KV_REST_API_READ_ONLY_TOKEN=12345
QUICKNODE_KEY=12345
```

III. Run the development server
```
npm run dev
```
