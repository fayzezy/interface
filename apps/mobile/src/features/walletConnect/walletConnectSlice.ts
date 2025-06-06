import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ProposalTypes, SessionTypes } from '@walletconnect/types'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { DappInfo, EthMethod, EthSignMethod, EthTransaction, UwULinkMethod } from 'uniswap/src/types/walletConnect'

export type WalletConnectPendingSession = {
  id: string
  chains: UniverseChainId[]
  dapp: DappInfo
  proposalNamespaces: ProposalTypes.RequiredNamespaces
}

export type WalletConnectSession = {
  id: string
  chains: UniverseChainId[]
  dapp: DappInfo
  namespaces: SessionTypes.Namespaces
}

interface SessionMapping {
  [sessionId: string]: WalletConnectSession
}

interface BaseRequest {
  sessionId: string
  internalId: string
  account: string
  dapp: DappInfo
  chainId: UniverseChainId
}

export interface SignRequest extends BaseRequest {
  type: EthSignMethod
  message: string | null
  rawMessage: string
}

export interface TransactionRequest extends BaseRequest {
  type: EthMethod.EthSendTransaction
  transaction: EthTransaction
}

export interface WalletCapabilitiesRequest extends Omit<BaseRequest, 'chainId'> {
  type: EthMethod.GetCapabilities
  account: Address // Wallet address
  chainIds?: UniverseChainId[] // Optional array of chain IDs
}

export interface UwuLinkErc20Request extends BaseRequest {
  type: UwULinkMethod.Erc20Send
  recipient: {
    address: string
    name: string
    logo?: {
      dark?: string
      light?: string
    }
  }
  tokenAddress: string
  amount: string
  isStablecoin: boolean
  transaction: EthTransaction // the formatted transaction, prepared by the wallet
}

export type WalletConnectRequest = SignRequest | TransactionRequest | UwuLinkErc20Request

export const isTransactionRequest = (request: WalletConnectRequest): request is TransactionRequest =>
  request.type === EthMethod.EthSendTransaction || request.type === UwULinkMethod.Erc20Send

export interface WalletConnectState {
  byAccount: {
    [accountId: string]: {
      sessions: SessionMapping
    }
  }
  pendingSession: WalletConnectPendingSession | null
  pendingRequests: WalletConnectRequest[]
  didOpenFromDeepLink?: boolean
  hasPendingSessionError?: boolean
}

export const initialWalletConnectState: Readonly<WalletConnectState> = {
  byAccount: {},
  pendingSession: null,
  pendingRequests: [],
}

const slice = createSlice({
  name: 'walletConnect',
  initialState: initialWalletConnectState,
  reducers: {
    addSession: (state, action: PayloadAction<{ account: string; wcSession: WalletConnectSession }>) => {
      const { wcSession, account } = action.payload
      state.byAccount[account] ??= { sessions: {} }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      state.byAccount[account]!.sessions[wcSession.id] = wcSession
      state.pendingSession = null
    },

    removeSession: (state, action: PayloadAction<{ sessionId: string; account?: string }>) => {
      const { sessionId, account } = action.payload

      // If account address is known, delete directly
      if (account) {
        const wcAccount = state.byAccount[account]
        if (wcAccount) {
          delete wcAccount.sessions[sessionId]
        }
        return
      }

      // If account address is not known (handling `session_delete` events),
      // iterate over each account and delete the sessionId
      Object.keys(state.byAccount).forEach((accountAddress) => {
        const wcAccount = state.byAccount[accountAddress]
        if (wcAccount && wcAccount.sessions[sessionId]) {
          delete wcAccount.sessions[sessionId]
        }
      })
    },

    addPendingSession: (state, action: PayloadAction<{ wcSession: WalletConnectPendingSession }>) => {
      const { wcSession } = action.payload
      state.pendingSession = wcSession
    },

    removePendingSession: (state) => {
      state.pendingSession = null
    },

    addRequest: (state, action: PayloadAction<{ request: WalletConnectRequest; account: string }>) => {
      const { request } = action.payload
      state.pendingRequests.push(request)
    },

    removeRequest: (state, action: PayloadAction<{ requestInternalId: string; account: string }>) => {
      const { requestInternalId } = action.payload
      state.pendingRequests = state.pendingRequests.filter((req) => req.internalId !== requestInternalId)
    },

    setDidOpenFromDeepLink: (state, action: PayloadAction<boolean | undefined>) => {
      state.didOpenFromDeepLink = action.payload
    },

    setHasPendingSessionError: (state, action: PayloadAction<boolean | undefined>) => {
      state.hasPendingSessionError = action.payload
    },
  },
})

export const {
  addSession,
  removeSession,
  addPendingSession,
  removePendingSession,
  addRequest,
  removeRequest,
  setDidOpenFromDeepLink,
  setHasPendingSessionError,
} = slice.actions
export const { reducer: walletConnectReducer } = slice
