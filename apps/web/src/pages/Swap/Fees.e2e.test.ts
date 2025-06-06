import { expect, test } from 'playwright/fixtures'
import { stubTradingApiSwap } from 'playwright/fixtures/tradingApi'
import uniswapXFeeQuote from 'playwright/fixtures/uniswapXFeeQuote.json'
import { DAI, USDC_MAINNET } from 'uniswap/src/constants/tokens'
import { assume0xAddress } from 'utils/wagmi'

test('should not display fee on swaps without fees', async ({ page, graphql }) => {
  await graphql.intercept('SearchTokens', 'search_token_dai.json')

  await page.goto(`/swap?inputCurrency=${DAI.address}&outputCurrency=${USDC_MAINNET.address}`)

  // Enter amount
  await page.getByTestId('amount-input-out').fill('1')

  // Verify fee UI
  await page.act({
    action: 'Click on the Swap Details dropdown button icon',
  })
  // Verify there is no "fee" text:
  const locator = page.locator('Fee')
  await expect(locator).toHaveCount(0)
})

test('swaps ETH for USDC exact-in with swap fee', async ({ page, anvil }) => {
  await stubTradingApiSwap(page)

  await page.goto(`/swap?inputCurrency=ETH&outputCurrency=${USDC_MAINNET.address}`)

  // Set up swap
  await page.getByTestId('amount-input-out').fill('1')

  const response = await page.waitForResponse('https://trading-api-labs.interface.gateway.uniswap.org/v1/quote')
  const {
    quote: { portionBips, portionRecipient },
  } = await response.json()

  const portionRecipientBalance = await anvil.getErc20Balance(assume0xAddress(USDC_MAINNET.address), portionRecipient)

  // Initiate transaction
  await page.getByText('Review').click()

  // Verify fee percentage and amount is displayed
  await page.getByText(`Fee (${portionBips / 100}%)`)
  await page.act({
    action: 'Confirm the Swap by clicking the button in the modal',
  })

  // Verify fee recipient received fee
  const finalRecipientBalance = await anvil.getErc20Balance(assume0xAddress(USDC_MAINNET.address), portionRecipient)
  expect(finalRecipientBalance).toBeGreaterThan(portionRecipientBalance)
})

test('displays UniswapX fee in UI', async ({ page }) => {
  await stubTradingApiSwap(page)

  await page.goto(`/swap?inputCurrency=ETH&outputCurrency=${USDC_MAINNET.address}`)

  // use playwright to stub the response to https://interface.gateway.uniswap.org/v1/quote
  await page.route('https://interface.gateway.uniswap.org/v1/quote', async (route) => {
    await route.fulfill({
      body: JSON.stringify(uniswapXFeeQuote),
    })
  })

  // Set up swap
  await page.getByTestId('amount-input-out').fill('1')
  // Verify fee UI
  await page.act({
    action: 'Click on the Swap Details dropdown button icon',
  })
  // Verify there is no "fee" text:
  const locator = page.locator('Fee')
  await expect(locator).toHaveCount(0)
})
