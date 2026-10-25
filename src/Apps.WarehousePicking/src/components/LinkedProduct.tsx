import { Body1, Caption1, Card, Image, Spinner } from "@fluentui/react-components"
import { useProductImage } from "@/utils/products"

export function LinkedProduct({ productId, productName }: { productId?: string; productName?: string }) {
  const image = useProductImage(productId)
  if (!productId) return <Caption1>No product linked yet.</Caption1>
  return (
    <Card orientation="horizontal" style={{ maxWidth: 420 }}>
      {image.isLoading ? <Spinner size="tiny" /> : image.data
        ? <Image src={image.data} alt={productName} width={80} height={80} fit="contain" />
        : <Caption1>No image</Caption1>}
      <Body1><b>Product:</b> {productName}</Body1>
    </Card>
  )
}
