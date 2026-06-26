"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CartItem from "@/app/components/ecommerce/CartItem";
import BackButton from "@/app/components/navigation/BackButton";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
// Imported ConfirmModal
import ConfirmModal from "@/app/components/ui/ConfirmModal";

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

  const [shippingAddress, setShippingAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // New state to control the modal visibility
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const addressRegex = /^[a-zA-Z0-9\s,.\-#/]+$/;
  const phoneRegex = /^\d+$/;

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
        mode: "set",
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

  // 1. Step one: Validate inputs first, then trigger the confirmation modal
  function handleCheckout() {
    setCheckoutError("");

    if (!shippingAddress.trim()) {
      setCheckoutError("Shipping address is required.");
      return;
    }

    if (!addressRegex.test(shippingAddress.trim())) {
      setCheckoutError("Shipping address contains invalid characters.");
      return;
    }

    if (!contactPhone.trim()) {
      setCheckoutError("Contact phone is required.");
      return;
    }

    if (!phoneRegex.test(contactPhone.trim())) {
      setCheckoutError("Contact number may only contain digits.");
      return;
    }

    // Input data looks great! Show confirmation modal instead of calling API immediately
    setShowCheckoutConfirm(true);
  }

  // 2. Step two: Fired when user explicitly clicks "Confirm" in the modal
  async function executeOrderPlacement() {
    try {
      setPlacingOrder(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingAddress,
          contactPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckoutError(data.error || "Failed to place order.");
        setShowCheckoutConfirm(false); // Close the modal on backend errors to expose the error banner
        return;
      }

      alert("Order placed successfully!");
      setCart(null);
      window.location.href = "/orders";
    } finally {
      setPlacingOrder(false);
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
            <Button onClick={() => router.push("/")}>Browse Products</Button>
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
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3">Checkout</h2>

            {/* Display validation or checkout errors locally if any exist */}
            {checkoutError && (
              <p className="auth-error mb-3">{checkoutError}</p>
            )}

            <div className="auth-group">
              <label>Shipping Address</label>
              <textarea
                className="textarea"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>

            <div className="auth-group">
              <label>Contact Number</label>
              <input
                className="input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCheckout}
              disabled={placingOrder || cart.items.length === 0}
            >
              {placingOrder
                ? "Placing Order..."
                : `Place Order • ₱${(totalCents / 100).toFixed(2)}`}
            </Button>
          </Card>
        </>
      )}

      {/* 3. The New Checkout Confirmation Modal */}
      <ConfirmModal
        open={showCheckoutConfirm}
        title="Confirm Your Order"
        message={`Are you ready to finalize this order? You will be billed ₱${(totalCents / 100).toFixed(2)}.`}
        confirmText={placingOrder ? "Placing Order..." : "Confirm & Pay"}
        onCancel={() => setShowCheckoutConfirm(false)}
        onConfirm={executeOrderPlacement}
      />
    </div>
  );
}
