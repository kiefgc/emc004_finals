import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";

interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  stockQuantity: number;
  imageUrl: string;
}

interface Props {
  product: Product;
  isLoggedIn: boolean;
}

export default function ProductCard({ product, isLoggedIn }: Props) {
  return (
    <Card>
      <img
        src={product.imageUrl}
        alt={product.name}
        className="product-image"
      />

      <h3>{product.name}</h3>

      <p className="mt-1">{product.description}</p>

      <div className="product-price">
        ₱{(product.priceCents / 100).toFixed(2)}
      </div>

      <p className="stock">Stock Available: {product.stockQuantity}</p>

      <button className="btn btn-primary w-full mt-2">Add to Cart</button>
    </Card>
  );
}
