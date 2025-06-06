import { useCallback, useMemo } from 'react'
import { ParsedWarnings } from 'uniswap/src/components/modals/WarningModal/types'
import { AuthTrigger } from 'uniswap/src/features/auth/types'
import { TransactionScreen } from 'uniswap/src/features/transactions/TransactionModal/TransactionModalContext'
import { SwapFormState } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { GetSwapService } from 'uniswap/src/features/transactions/swap/review/services/swapService'
import { TransactionStep } from 'uniswap/src/features/transactions/swap/types/steps'
import { SetCurrentStepFn } from 'uniswap/src/features/transactions/swap/types/swapCallback'
import { createTransactionId } from 'uniswap/src/utils/createTransactionId'
import { isInterface } from 'utilities/src/platform'

interface SwapReviewCallbacks {
  onSwapButtonClick: () => Promise<void>
  onConfirmWarning: () => void
  onCancelWarning: () => void
  onShowWarning: () => void
  onCloseWarning: () => void
}

export function useCreateSwapReviewCallbacks(ctx: {
  resetCurrentStep: () => void
  setScreen: (screen: TransactionScreen) => void
  authTrigger?: AuthTrigger
  onSubmitSwap?: () => Promise<void>
  setSubmissionError: (error?: Error) => void
  onClose: () => void
  showWarningModal: boolean
  warningAcknowledged: boolean
  shouldSubmitTx: boolean
  setShowWarningModal: (show: boolean) => void
  setWarningAcknowledged: (acknowledged: boolean) => void
  setShouldSubmitTx: (shouldSubmit: boolean) => void
  getSwapService: GetSwapService
  updateSwapForm: (newState: Partial<SwapFormState>) => void
  reviewScreenWarning: ParsedWarnings['reviewScreenWarning']
  setCurrentStep: SetCurrentStepFn
  setSteps: (steps: TransactionStep[]) => void
}): SwapReviewCallbacks {
  const {
    resetCurrentStep,
    setScreen,
    authTrigger,
    onSubmitSwap,
    setSubmissionError,
    onClose,
    showWarningModal,
    warningAcknowledged,
    shouldSubmitTx,
    setShowWarningModal,
    setWarningAcknowledged,
    setShouldSubmitTx,
    getSwapService,
    updateSwapForm,
    reviewScreenWarning,
    setCurrentStep,
    setSteps,
  } = ctx

  const onFailure = useCallback(
    (error?: Error) => {
      resetCurrentStep()

      // Create a new txId for the next transaction, as the existing one may be used in state to track the failed submission.
      const newTxId = createTransactionId()
      updateSwapForm({ isSubmitting: false, txId: newTxId })

      setSubmissionError(error)
    },
    [updateSwapForm, setSubmissionError, resetCurrentStep],
  )

  const onSuccess = useCallback(() => {
    // On interface, the swap component stays mounted; after swap we reset the form to avoid showing the previous values.
    if (isInterface) {
      updateSwapForm({ exactAmountFiat: undefined, exactAmountToken: '', isSubmitting: false })
      setScreen(TransactionScreen.Form)
    }
    onClose?.()
  }, [setScreen, updateSwapForm, onClose])

  const swapService = useMemo(
    () =>
      getSwapService({
        onSuccess,
        onFailure,
        setCurrentStep,
        setSteps,
      }),
    [getSwapService, onSuccess, onFailure, setCurrentStep, setSteps],
  )

  const submitTransaction = useCallback(() => {
    if (reviewScreenWarning && !showWarningModal && !warningAcknowledged) {
      setShouldSubmitTx(true)
      setShowWarningModal(true)
      return
    }

    swapService.executeTransaction()
  }, [reviewScreenWarning, showWarningModal, warningAcknowledged, setShouldSubmitTx, setShowWarningModal, swapService])

  const onSwapButtonClick = useCallback(async () => {
    updateSwapForm({ isSubmitting: true })

    if (authTrigger) {
      await authTrigger({
        successCallback: submitTransaction,
        failureCallback: onFailure,
      })
    } else {
      submitTransaction()
    }
    await onSubmitSwap?.()
  }, [authTrigger, onFailure, submitTransaction, updateSwapForm, onSubmitSwap])

  const onConfirmWarning = useCallback(() => {
    setWarningAcknowledged(true)
    setShowWarningModal(false)

    if (shouldSubmitTx) {
      swapService.executeTransaction()
    }
  }, [shouldSubmitTx, swapService, setShowWarningModal, setWarningAcknowledged])

  const onCancelWarning = useCallback(() => {
    if (shouldSubmitTx) {
      onFailure()
    }

    setShowWarningModal(false)
    setWarningAcknowledged(false)
    setShouldSubmitTx(false)
  }, [onFailure, shouldSubmitTx, setShowWarningModal, setWarningAcknowledged, setShouldSubmitTx])

  const onShowWarning = useCallback(() => {
    setShowWarningModal(true)
  }, [setShowWarningModal])

  const onCloseWarning = useCallback(() => {
    setShowWarningModal(false)
  }, [setShowWarningModal])

  return {
    onSwapButtonClick,
    onConfirmWarning,
    onCancelWarning,
    onShowWarning,
    onCloseWarning,
  }
}
