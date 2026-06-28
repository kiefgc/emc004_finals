"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setDraftQuantity(item.quantity);
  }, [item.quantity]);

  const activeQuantity = editing ? draftQuantity : item.quantity;
  const subtotal = activeQuantity * item.product.priceCents;

  async function saveQuantity() {
    if (draftQuantity === item.quantity) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
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
          src={item.product.imageUrl || "/placeholder-product.png"}
          alt={item.product.name}
          className="product-image"
          style={{
            height: "150px",
            marginBottom: 0,
            objectFit: "cover",
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
                  onClick={() =>
                    setDraftQuantity((prev) => Math.max(1, prev - 1))
                  }
                  disabled={draftQuantity <= 1 || saving}
                >
                  -
                </Button>

                <span>{draftQuantity}</span>

                <Button
                  variant="secondary"
                  onClick={() =>
                    setDraftQuantity((prev) =>
                      Math.min(item.product.stockQuantity, prev + 1),
                    )
                  }
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
            <Button variant="danger" onClick={() => setShowConfirm(true)}>
              Remove
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Remove Item"
        message={`Remove ${item.product.name} from your cart?`}
        confirmText={removing ? "Removing..." : "Remove"}
        danger
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setRemoving(true);
          try {
            await onRemove(item.id);
          } catch (error) {
            console.error("Failed to remove item", error);
          } finally {
            setRemoving(false);
            setShowConfirm(false);
          }
        }}
      />
    </Card>
  );
}
