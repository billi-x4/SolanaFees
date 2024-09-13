type HeliusParsedTransaction = {
	fee: number
	feePayer: string
	signature: string
	source: string
	timestamp: number
	transactionError: string | null
	type: string
}

type HeliusParsedTransactionResponse =
	| Array<HeliusParsedTransaction>
	| { error: string }

type TransactionAggregation = {
	firstTransactionTS: number
	failedTransactions: number
	feesAvg: number
	feesTotal: number
	transactionsCount: number
	unpaidTransactionsCount: number
}

type Categorization = { [key: string]: { count: number; fees: number } }

type WalletResult = {
  fees: any
	aggregation: TransactionAggregation | null
	categorizations: Categorization | null
}

type WalletsSummary = Partial<WalletResult> & {
	firstTransaction: Date
	solFees: number
	solAvgFee: number
	usdFees: number
	usdAvgFee: number
	txCount: number
	txCountUnpaid: number
}

type TransactionFetchingStatusState =
	| "intro"
	| "error"
	| "loading"
	| "resolving"
	| "done"

type TransactionFetchingStatus = {
	error: Error | string | null
	isLoading: boolean
	summary: WalletResult | null
	state: TransactionFetchingStatusState
	transactions: Array<HeliusParsedTransaction> | null
}

type PricesAndFees = {
  solanaPrice: any
	avgGasFees: Record<string, number>
	avgTxGasUsage: Record<string, number>
	prices: Record<string, number>
	symbols: Record<string, string>
}

export {
	type Categorization,
	type HeliusParsedTransaction,
	type HeliusParsedTransactionResponse,
	type PricesAndFees,
	type TransactionAggregation,
	type TransactionFetchingStatus,
	type TransactionFetchingStatusState,
	type WalletResult,
	type WalletsSummary,
}
