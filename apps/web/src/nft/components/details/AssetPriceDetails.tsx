import { NFTEventName } from '@uniswap/analytics-events'
import { OpacityHoverState } from 'components/Common/styles'
import { Share } from 'components/Icons/Share'
import { useNftBalance } from 'graphql/data/nft/NftBalance'
import { useAccount } from 'hooks/useAccount'
import styled, { css, useTheme } from 'lib/styled-components'
import { CancelListingIcon, VerifiedIcon } from 'nft/components/icons'
import { useBag, useNativeUsdPrice, useProfilePageState, useSellAsset, useUsdPriceofNftAsset } from 'nft/hooks'
import { CollectionInfoForAsset, GenieAsset, ProfilePageStateType, WalletAsset } from 'nft/types'
import { generateTweetForAsset, getMarketplaceIcon, timeLeft } from 'nft/utils'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemedText } from 'theme/components'
import { ExternalLink } from 'theme/components/Links'
import { Flex } from 'ui/src'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { shortenAddress } from 'utilities/src/addresses'
import { useTrace } from 'utilities/src/telemetry/trace/TraceContext'
import { NumberType, useFormatter } from 'utils/formatNumbers'

const TWITTER_WIDTH = 560
const TWITTER_HEIGHT = 480

interface AssetPriceDetailsProps {
  asset: GenieAsset
  collection: CollectionInfoForAsset
}

const hoverState = css`
  :hover::after {
    border-radius: 12px;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.deprecated_stateOverlayHover};
    z-index: 0;
  }

  :active::after {
    border-radius: 12px;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.deprecated_stateOverlayPressed};
    z-index: 0;
  }
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 24px;

  @media (min-width: calc(960px + 1px)) {
    position: fixed;
    width: 360px;
    margin-top: 20px;
  }
`

const BestPriceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 16px;
`

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
`

const PriceRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`

const BuyNowButton = styled.div<{
  assetInBag: boolean
  margin: boolean
  useAccentColor: boolean
}>`
  position: relative;
  width: 100%;
  background-color: ${({ theme, assetInBag, useAccentColor }) =>
    assetInBag ? theme.critical : useAccentColor ? theme.accent1 : theme.surface3};
  border-radius: 12px;
  padding: 10px 12px;
  margin-top: ${({ margin }) => (margin ? '12px' : '0px')};
  text-align: center;
  cursor: pointer;

  ${hoverState}
`

const BuyNowButtonContainer = styled.div`
  position: relative;
`

const Tertiary = styled(ThemedText.BodySecondary)`
  color: ${({ theme }) => theme.neutral3};
`

const UploadLink = styled.a`
  color: ${({ theme }) => theme.neutral2};
  cursor: pointer;

  ${OpacityHoverState}
`

const NotForSaleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 48px 18px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

const DiscoveryContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const OwnerText = styled.a`
  font-size: 16px;
  font-weight: 535;
  line-height: 20px;
  color: ${({ theme }) => theme.neutral2};
  text-decoration: none;

  ${OpacityHoverState}
`

const OwnerInformationContainer = styled.div`
  color: ${({ theme }) => theme.neutral2};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 8px;
`

const AssetInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const AssetHeader = styled.h1`
  display: -webkit-box;
  align-items: center;
  font-size: 28px;
  font-weight: 535;
  line-height: 36px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.neutral1};
  margin: 0;
`

const CollectionNameContainer = styled.div`
  display: flex;
  justify-content: space-between;
`

const CollectionHeader = styled.span`
  font-size: 16px;
  font-weight: 485;
  line-height: 24px;
  color: ${({ theme }) => theme.neutral1};
  text-decoration: none;
  ${OpacityHoverState};
`

const VerifiedIconContainer = styled.span`
  position: relative;
`

const StyledVerifiedIcon = styled(VerifiedIcon)`
  position: absolute;
  top: 0px;
`

const DefaultLink = styled(Link)`
  text-decoration: none;
`

const MarketplaceIcon = styled(ExternalLink)`
  display: flex;
  align-items: center;
`

const OwnerContainer = ({ asset }: { asset: WalletAsset }) => {
  const navigate = useNavigate()
  const ethUsdPrice = useNativeUsdPrice()
  const setSellPageState = useProfilePageState((state) => state.setProfilePageState)
  const selectSellAsset = useSellAsset((state) => state.selectSellAsset)
  const resetSellAssets = useSellAsset((state) => state.reset)
  const { formatEther, formatNumberOrString } = useFormatter()

  const listing = asset.sellOrders && asset.sellOrders.length > 0 ? asset.sellOrders[0] : undefined
  const expirationDate = listing?.endAt ? new Date(listing.endAt) : undefined

  const USDPrice = useMemo(
    () => (ethUsdPrice && asset.floor_sell_order_price ? ethUsdPrice * asset.floor_sell_order_price : undefined),
    [ethUsdPrice, asset.floor_sell_order_price],
  )
  const trace = useTrace()

  const goToListPage = () => {
    resetSellAssets()
    navigate('/nfts/profile')
    selectSellAsset(asset)
    sendAnalyticsEvent(NFTEventName.NFT_SELL_ITEM_ADDED, {
      collection_address: asset.asset_contract.address,
      token_id: asset.tokenId,
      ...trace,
    })
    setSellPageState(ProfilePageStateType.LISTING)
  }

  return (
    <BestPriceContainer>
      <HeaderRow>
        <ThemedText.SubHeader color="accent1">{listing ? 'Your Price' : 'List for Sale'}</ThemedText.SubHeader>
        {listing && (
          <MarketplaceIcon href={listing.marketplaceUrl}>
            {getMarketplaceIcon(listing.marketplace, '20')}
          </MarketplaceIcon>
        )}
      </HeaderRow>
      <PriceRow>
        {listing ? (
          <>
            <ThemedText.MediumHeader fontSize="28px" lineHeight="36px">
              {formatEther({
                input: asset.priceInfo?.ETHPrice,
                type: NumberType.NFTToken,
              })}{' '}
              ETH
            </ThemedText.MediumHeader>
            {USDPrice && (
              <ThemedText.BodySecondary lineHeight="24px">
                {formatNumberOrString({ input: USDPrice, type: NumberType.FiatNFTToken })}
              </ThemedText.BodySecondary>
            )}
          </>
        ) : (
          <ThemedText.BodySecondary fontSize="14px" lineHeight="20px">
            Get the best price for your NFT by selling with Uniswap.
          </ThemedText.BodySecondary>
        )}
      </PriceRow>
      {expirationDate && (
        <ThemedText.BodySecondary fontSize="14px">Sale ends: {timeLeft(expirationDate)}</ThemedText.BodySecondary>
      )}
      {!listing ? (
        <BuyNowButton assetInBag={false} margin={true} useAccentColor={true} onClick={goToListPage}>
          <ThemedText.SubHeader lineHeight="20px" color="white">
            List
          </ThemedText.SubHeader>
        </BuyNowButton>
      ) : (
        <>
          <BuyNowButton assetInBag={false} margin={true} useAccentColor={false} onClick={goToListPage}>
            <ThemedText.SubHeader lineHeight="20px">Adjust listing</ThemedText.SubHeader>
          </BuyNowButton>
        </>
      )}
    </BestPriceContainer>
  )
}

const StyledLink = styled(Link)`
  text-decoration: none;
  ${OpacityHoverState}
`

const NotForSale = ({ collectionName, collectionUrl }: { collectionName: string; collectionUrl: string }) => {
  const theme = useTheme()

  return (
    <BestPriceContainer>
      <NotForSaleContainer>
        <CancelListingIcon width="79px" height="79px" color={theme.neutral3} />
        <ThemedText.SubHeader>Not for sale</ThemedText.SubHeader>
        <DiscoveryContainer>
          <ThemedText.BodySecondary fontSize="14px" lineHeight="20px">
            Discover similar NFTs for sale in
          </ThemedText.BodySecondary>
          <StyledLink to={`/nfts/collection/${collectionUrl}`}>
            <ThemedText.Link lineHeight="20px">{collectionName}</ThemedText.Link>
          </StyledLink>
        </DiscoveryContainer>
      </NotForSaleContainer>
    </BestPriceContainer>
  )
}

export const AssetPriceDetails = ({ asset, collection }: AssetPriceDetailsProps) => {
  const account = useAccount()
  const { formatEther, formatNumberOrString } = useFormatter()

  const cheapestOrder = asset.sellorders && asset.sellorders.length > 0 ? asset.sellorders[0] : undefined
  const expirationDate = cheapestOrder?.endAt ? new Date(cheapestOrder.endAt) : undefined

  const itemsInBag = useBag((s) => s.itemsInBag)
  const addAssetsToBag = useBag((s) => s.addAssetsToBag)
  const removeAssetsFromBag = useBag((s) => s.removeAssetsFromBag)
  const toggleBag = useBag((s) => s.toggleBag)
  const bagExpanded = useBag((s) => s.bagExpanded)

  const USDPrice = useUsdPriceofNftAsset(asset)

  const assetsFilter = [{ address: asset.address, tokenId: asset.tokenId }]
  const { walletAssets: ownerAssets } = useNftBalance({ ownerAddress: account.address ?? '', assetsFilter, first: 1 })
  const walletAsset: WalletAsset | undefined = useMemo(() => ownerAssets?.[0], [ownerAssets])

  const { assetInBag } = useMemo(() => {
    return {
      assetInBag: itemsInBag.some(
        (item) => asset.tokenId === item.asset.tokenId && asset.address === item.asset.address,
      ),
    }
  }, [asset, itemsInBag])

  const shareTweet = () => {
    window.open(
      generateTweetForAsset(asset),
      'newwindow',
      `left=${(window.screen.width - TWITTER_WIDTH) / 2}, top=${
        (window.screen.height - TWITTER_HEIGHT) / 2
      }, width=${TWITTER_WIDTH}, height=${TWITTER_HEIGHT}`,
    )
  }

  const isOwner =
    asset.ownerAddress && !!walletAsset && account.address?.toLowerCase() === asset.ownerAddress?.toLowerCase()
  const isForSale = cheapestOrder && asset.priceInfo

  return (
    <Container>
      <AssetInfoContainer>
        <CollectionNameContainer>
          <DefaultLink to={`/nfts/collection/${asset.address}`}>
            <CollectionHeader>
              {collection.collectionName}
              <VerifiedIconContainer>{collection.isVerified && <StyledVerifiedIcon />}</VerifiedIconContainer>
            </CollectionHeader>
          </DefaultLink>
          <UploadLink onClick={shareTweet} target="_blank">
            <Share />
          </UploadLink>
        </CollectionNameContainer>
        <AssetHeader>{asset.name ?? `${asset.collectionName} #${asset.tokenId}`}</AssetHeader>
      </AssetInfoContainer>
      {isOwner ? (
        <OwnerContainer asset={walletAsset} />
      ) : isForSale ? (
        <BestPriceContainer>
          <HeaderRow>
            <ThemedText.SubHeader color="accent1">Best Price</ThemedText.SubHeader>
            <MarketplaceIcon href={cheapestOrder.marketplaceUrl}>
              {getMarketplaceIcon(cheapestOrder.marketplace, '20')}
            </MarketplaceIcon>
          </HeaderRow>
          <PriceRow>
            <ThemedText.MediumHeader fontSize="28px" lineHeight="36px">
              {formatEther({ input: asset.priceInfo.ETHPrice, type: NumberType.NFTToken })} ETH
            </ThemedText.MediumHeader>
            {USDPrice && (
              <ThemedText.BodySecondary lineHeight="24px">
                {formatNumberOrString({ input: USDPrice, type: NumberType.FiatNFTToken })}
              </ThemedText.BodySecondary>
            )}
          </PriceRow>
          {expirationDate && expirationDate > new Date() && (
            <Tertiary fontSize="14px">Sale ends: {timeLeft(expirationDate)}</Tertiary>
          )}
          <Flex>
            <BuyNowButtonContainer>
              <BuyNowButton
                assetInBag={assetInBag}
                margin={true}
                useAccentColor={true}
                onClick={() => {
                  assetInBag ? removeAssetsFromBag([asset]) : addAssetsToBag([asset])
                  if (!assetInBag && !bagExpanded) {
                    toggleBag()
                  }
                }}
              >
                <ThemedText.SubHeader color="white" lineHeight="20px">
                  <span data-testid="nft-details-toggle-bag">{assetInBag ? 'Remove' : 'Add to Bag'}</span>
                </ThemedText.SubHeader>
              </BuyNowButton>
            </BuyNowButtonContainer>
          </Flex>
        </BestPriceContainer>
      ) : (
        <NotForSale collectionName={collection.collectionName ?? 'this collection'} collectionUrl={asset.address} />
      )}
      {isForSale && (
        <OwnerInformationContainer>
          {asset.tokenType !== 'ERC1155' && asset.ownerAddress && (
            <ThemedText.BodySmall color="neutral2" lineHeight="20px">
              Seller:
            </ThemedText.BodySmall>
          )}
          <OwnerText
            target="_blank"
            href={`https://etherscan.io/address/${asset.ownerAddress}`}
            rel="noopener noreferrer"
          >
            {asset.tokenType === 'ERC1155' ? (
              ''
            ) : (
              <span> {isOwner ? 'You' : asset.ownerAddress && shortenAddress(asset.ownerAddress, 2)}</span>
            )}
          </OwnerText>
        </OwnerInformationContainer>
      )}
    </Container>
  )
}
