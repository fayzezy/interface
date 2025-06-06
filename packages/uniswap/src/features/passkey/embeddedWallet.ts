import {
  Action,
  AuthenticationTypes,
  Authenticator,
} from '@uniswap/client-embeddedwallet/dist/uniswap/embeddedwallet/v1/service_pb'
import {
  fetchChallengeRequest,
  fetchCreateWalletRequest,
  fetchDisconnectRequest,
  fetchExportSeedPhraseRequest,
  fetchListAuthenticatorsRequest,
  fetchSignMessagesRequest,
  fetchSignTransactionRequest,
  fetchSignTypedDataRequest,
  fetchWalletSigninRequest,
} from 'uniswap/src/data/rest/embeddedWallet/requests'
import { authenticatePasskey, registerPasskey } from 'uniswap/src/features/passkey/passkey'
import { isAddress } from 'utilities/src/addresses'
import { logger } from 'utilities/src/logger/logger'

export type BE_AUTHENTICATOR_TYPE = Authenticator

// Registration

async function registerNewPasskey(): Promise<string | undefined> {
  try {
    const challenge = await fetchChallengeRequest({
      type: AuthenticationTypes.PASSKEY_REGISTRATION,
      action: Action.CREATE_WALLET,
    })
    return await registerPasskey(challenge.challengeOptions)
  } catch (registrationError: unknown) {
    if (registrationError instanceof Error && registrationError.name === 'AbortError') {
      logger.debug('embeddedWallet.ts', 'registerNewPasskey', 'User aborted registration')
    } else {
      // TODO[EW]: Add more in depth error handling
      logger.debug('embeddedWallet.ts', 'registerNewPasskey', `Error during registration: ${registrationError}`)
    }
  }
  return undefined
}

export async function createNewEmbeddedWallet(): Promise<`0x${string}` | undefined> {
  try {
    const passkeyCredential = await registerNewPasskey()
    if (!passkeyCredential) {
      return undefined
    }

    const createWalletResp = await fetchCreateWalletRequest({ credential: passkeyCredential })
    if (createWalletResp?.walletAddress) {
      logger.debug(
        'embeddedWallet.ts',
        'createNewEmbeddedWallet',
        `New wallet created: ${createWalletResp.walletAddress}`,
      )
      if (!isAddress(createWalletResp.walletAddress)) {
        logger.error(new Error('Invalid address returned from create wallet response'), {
          tags: {
            file: 'embeddedWallet.ts',
            function: 'createNewEmbeddedWallet',
          },
        })
        return undefined
      }
      return createWalletResp.walletAddress as `0x${string}`
    }
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'createNewEmbeddedWallet',
      },
    })
  }
  return undefined
}

// Authentication

async function authenticateWithPasskey(action: Action): Promise<string | undefined> {
  try {
    const challenge = await fetchChallengeRequest({
      type: AuthenticationTypes.PASSKEY_AUTHENTICATION,
      action,
    })
    return await authenticatePasskey(challenge.challengeOptions)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.debug('embeddedWallet.ts', 'authenticateWithPasskey', 'User aborted the registration process')
    } else {
      logger.error(new Error('Error during registration', { cause: error }), {
        tags: {
          file: 'embeddedWallet.ts',
          function: 'authenticateWithPasskey',
        },
      })
    }
  }
  return undefined
}

export async function signInWithPasskey(): Promise<`0x${string}` | undefined> {
  try {
    const credential = await authenticateWithPasskey(Action.WALLET_SIGNIN)
    if (!credential) {
      return undefined
    }
    const signInResp = await fetchWalletSigninRequest({ credential })
    if (signInResp?.walletAddress) {
      return signInResp.walletAddress as `0x${string}`
    }
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'signInWithPasskey',
      },
    })
  }
  return undefined
}

export async function signMessagesWithPasskey(messages: string[]): Promise<string[] | undefined> {
  try {
    const credential = await authenticateWithPasskey(Action.SIGN_MESSAGES)
    const signedMessagesResp = await fetchSignMessagesRequest({ messages, credential })
    return signedMessagesResp.signedMessages
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'signMessagesWithPasskey',
      },
    })
    return undefined
  }
}

export async function signTransactionWithPasskey(transactions: string[]): Promise<string[] | undefined> {
  try {
    const credential = await authenticateWithPasskey(Action.SIGN_TRANSACTIONS)
    const signedTransactionResp = await fetchSignTransactionRequest({
      transactions,
      credential,
    })
    return signedTransactionResp.signedTransactions
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'signTransactionWithPasskey',
      },
    })
    return undefined
  }
}

export async function signTypedDataWithPasskey(typedDataBatch: string[]): Promise<string[] | undefined> {
  try {
    const credential = await authenticateWithPasskey(Action.SIGN_TYPED_DATA_BATCH)
    const signedTypedDataResp = await fetchSignTypedDataRequest({
      typedDataBatch,
      credential,
    })
    return signedTypedDataResp.signature
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'signTypedDataWithPasskey',
      },
    })
    return undefined
  }
}

export async function exportEncryptedSeedPhrase(encryptionKey: string): Promise<string | undefined> {
  try {
    const credential = await authenticateWithPasskey(Action.EXPORT_SEED_PHRASE)
    if (!credential) {
      return undefined
    }
    const seedPhraseResp = await fetchExportSeedPhraseRequest({
      encryptionKey,
      credential,
    })
    return seedPhraseResp.encryptedSeedPhrase
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'exportEncryptedSeedPhrase',
      },
    })
  }
  return undefined
}

export async function disconnectWallet(): Promise<void> {
  logger.debug('embeddedWallet.ts', 'disconnectWallet', 'Attempting to disconnect wallet')
  try {
    await fetchDisconnectRequest()
    logger.debug('embeddedWallet.ts', 'disconnectWallet', 'Wallet disconnected')
  } catch (error) {
    logger.error(error, {
      tags: {
        file: 'embeddedWallet.ts',
        function: 'disconnectWallet',
      },
    })
  }
}

export async function listAuthenticators(): Promise<Authenticator[]> {
  const credential = await authenticateWithPasskey(Action.LIST_AUTHENTICATORS)
  const listAuthenticatorsResp = await fetchListAuthenticatorsRequest({ credential: JSON.stringify(credential) })
  return listAuthenticatorsResp.authenticators
}
