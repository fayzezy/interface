import { TransactionSettingsContextProvider } from 'uniswap/src/features/transactions/settings/contexts/TransactionSettingsContext'
import { TransactionSettingKey } from 'uniswap/src/features/transactions/settings/slice'
import { SwapFlow, type SwapFlowProps } from 'uniswap/src/features/transactions/swap/SwapFlow'
import { SwapFormContextProvider } from 'uniswap/src/features/transactions/swap/contexts/SwapFormContext'
import { ProtocolPreference } from 'uniswap/src/features/transactions/swap/form/header/SwapFormSettings/settingsConfigurations/ProtocolPreference'
import { Slippage } from 'uniswap/src/features/transactions/swap/form/header/SwapFormSettings/settingsConfigurations/Slippage/Slippage'
import { useSwapCallback } from 'wallet/src/features/transactions/swap/hooks/useSwapCallback'
import { useWrapCallback } from 'wallet/src/features/transactions/swap/hooks/useWrapCallback'
import { SwapProtection } from 'wallet/src/features/transactions/swap/settings/SwapProtection'

type WalletSwapFlowProps = Omit<SwapFlowProps, 'settings' | 'swapCallback' | 'wrapCallback'> & {
  onSubmitSwap?: () => Promise<void>
}

const SETTINGS: SwapFlowProps['settings'] = [Slippage, SwapProtection, ProtocolPreference]

export function WalletSwapFlow({ onSubmitSwap, ...props }: WalletSwapFlowProps): JSX.Element {
  const swapCallback = useSwapCallback()
  const wrapCallback = useWrapCallback()

  return (
    <TransactionSettingsContextProvider settingKey={TransactionSettingKey.Swap}>
      <SwapFormContextProvider
        prefilledState={props.prefilledState}
        hideSettings={props.hideHeader}
        hideFooter={props.hideFooter}
      >
        <SwapFlow
          {...props}
          settings={SETTINGS}
          swapCallback={swapCallback}
          wrapCallback={wrapCallback}
          onSubmitSwap={onSubmitSwap}
        />
      </SwapFormContextProvider>
    </TransactionSettingsContextProvider>
  )
}
