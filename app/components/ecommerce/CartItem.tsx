"use client";

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

  onQuantityChange: (productId: number, quantity: number) => Promise<void>;

  onRemove: (cartItemId: number) => Promise<void>;
}

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const subtotal = item.quantity * item.product.priceCents;

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
                  onQuantityChange(item.productId, item.quantity - 1)
                }
                disabled={item.quantity <= 1}
              >
                -
              </Button>

              <span>{item.quantity}</span>

              <Button
                variant="secondary"
                onClick={() =>
                  onQuantityChange(item.productId, item.quantity + 1)
                }
              >
                +
              </Button>
            </div>
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
