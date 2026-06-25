"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CartItem from "@/app/components/ecommerce/CartItem";
import BackButton from "@/app/components/navigation/BackButton";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";

interface Cart {
  id: number;
  userId: string;
  updatedAt: string;

  items: CartItemType[];
}

interface CartItemType {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;

  product: {
    id: number;
    name: string;
    description: string;
    priceCents: number;
    stockQuantity: number;
    supplierName: string;
    imageUrl: string;
    createdAt: string;
  };
}

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);

  const [loading, setLoading] = useState(true);

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    fetchCart();
  }, []);

  async function fetchCart() {
    try {
      const response = await fetch("/api/cart", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load cart");

        return;
      }

      setCart(data);
    } catch {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      return;
    }

    const response = await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        quantity,
      }),
    });

    if (!response.ok) {
      return;
    }

    setCart((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        items: previous.items.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity,
              }
            : item,
        ),
      };
    });
  }

  async function removeItem(cartItemId: number) {
    const response = await fetch(`/api/cart/${cartItemId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    setCart((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        items: previous.items.filter((item) => item.id !== cartItemId),
      };
    });
  }

  async function checkout() {
    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Checkout failed");

        return;
      }

      router.push(`/orders/${data.id}`);
    } finally {
      setCheckoutLoading(false);
    }
  }

  const totalCents =
    cart?.items.reduce(
      (sum, item) => sum + item.quantity * item.product.priceCents,
      0,
    ) ?? 0;

  const totalItems =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  if (loading) {
    return (
      <div className="container section">
        <p>Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="container section">
      <BackButton href="/" label="Back to Home" />

      <h1>Shopping Cart</h1>

      {error && <p className="auth-error">{error}</p>}

      {!cart || cart.items.length === 0 ? (
        <Card className="text-center">
          <h2>Your cart is empty</h2>

          <p className="mt-2">Add some products to get started.</p>

          <div className="mt-3">
            <Button onClick={() => router.push("/products")}>
              Browse Products
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {cart.items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onQuantityChange={updateQuantity}
              onRemove={removeItem}
            />
          ))}

          <Card>
            <h2>Order Summary</h2>

            <p className="mt-2">Items: {totalItems}</p>

            <p className="mt-2">Total: ₱{(totalCents / 100).toFixed(2)}</p>

            <div className="mt-3">
              <Button onClick={checkout} disabled={checkoutLoading}>
                {checkoutLoading ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
