"use client";

import Card from "@/app/components/ui/Card";

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
  async function handleAddToCart() {
    if (!isLoggedIn) {
      alert("Please log in first.");
      return;
    }

    const response = await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: product.id,
        quantity: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Failed to add to cart.");
      return;
    }

    alert("Added to cart successfully.");
  }

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

      <button className="btn btn-primary w-full mt-2" onClick={handleAddToCart}>
        Add to Cart
      </button>
    </Card>
  );
}
