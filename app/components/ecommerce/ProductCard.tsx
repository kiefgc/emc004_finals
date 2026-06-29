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
  userRole?: string;
}

export default function ProductCard({ product, isLoggedIn, userRole }: Props) {
  const isAdmin = userRole === "ADMIN";

  async function handleAddToCart() {
    if (!isLoggedIn) {
      alert("Please log in first.");
      return;
    }

    if (isAdmin) {
      alert("Administrators cannot add items to a shopping cart.");
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

      <button
        disabled={isAdmin}
        className={`w-full mt-2 btn ${isAdmin ? "bg-gray-300 text-gray-500 cursor-not-allowed border-none" : "btn-primary"}`}
        onClick={handleAddToCart}
      >
        {isAdmin ? "Admin View Only" : "Add to Cart"}
      </button>
    </Card>
  );
}
