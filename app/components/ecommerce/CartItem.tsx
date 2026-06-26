"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";

interface CartItemProps {
  item: {
    id: number;
    quantity: number;
    productId: number;
    product: {
      id: number;
      name: string;
      description: string;
      priceCents: number;
      stockQuantity: number;
      imageUrl: string;
    };
  };
  // Updated type signature to accept the optional third parameter for real-time skipping
  onQuantityChange: (
    productId: number,
    quantity: number,
    skipApi?: boolean,
  ) => Promise<void>;
  onRemove: (cartItemId: number) => Promise<void>;
}

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(item.quantity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftQuantity(item.quantity);
  }, [item.quantity]);

  const subtotal = draftQuantity * item.product.priceCents;

  async function saveQuantity() {
    setSaving(true);
    try {
      // Fires the API call to save the final draft number to the database
      await onQuantityChange(item.productId, draftQuantity, false);
      setEditing(false);
    } catch (error) {
      console.error("Failed to save quantity", error);
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setDraftQuantity(item.quantity);
    // Reverts parent page summary totals back to original values
    onQuantityChange(item.productId, item.quantity, true);
    setEditing(false);
  }

  return (
    <Card className="mb-3">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "150px 1fr",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <img
          src={item.product.imageUrl}
          alt={item.product.name}
          className="product-image"
          style={{
            height: "150px",
            marginBottom: 0,
          }}
        />

        <div>
          <h3>{item.product.name}</h3>
          <p className="mb-2">{item.product.description}</p>
          <div className="product-price">
            ₱{(item.product.priceCents / 100).toFixed(2)}
          </div>

          <div className="mt-2 mb-2">
            <strong>Quantity:</strong>

            {!editing ? (
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  marginTop: "0.5rem",
                }}
              >
                <span>{item.quantity}</span>
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  marginTop: "0.5rem",
                }}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    const nextQty = Math.max(1, draftQuantity - 1);
                    setDraftQuantity(nextQty);
                    // Instantly updates parent summary state without DB overhead
                    onQuantityChange(item.productId, nextQty, true);
                  }}
                  disabled={draftQuantity <= 1 || saving}
                >
                  -
                </Button>

                <span>{draftQuantity}</span>

                <Button
                  variant="secondary"
                  onClick={() => {
                    const nextQty = Math.min(
                      item.product.stockQuantity,
                      draftQuantity + 1,
                    );
                    setDraftQuantity(nextQty);
                    // Instantly updates parent summary state without DB overhead
                    onQuantityChange(item.productId, nextQty, true);
                  }}
                  disabled={
                    draftQuantity >= item.product.stockQuantity || saving
                  }
                >
                  +
                </Button>

                <Button
                  variant="primary"
                  onClick={saveQuantity}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>

                <Button
                  variant="danger"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <p className="mt-2">
            <strong>Subtotal:</strong> ₱{(subtotal / 100).toFixed(2)}
          </p>

          <div className="mt-3">
            <Button variant="danger" onClick={() => onRemove(item.id)}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
