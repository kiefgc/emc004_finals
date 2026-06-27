"use client";

import { useState } from "react";

import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
import Badge from "@/app/components/ui/Badge";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

interface OrderItem {
  id: number;
  quantity: number;
  priceAtPurchaseCents: number;

  product: {
    id: number;
    name: string;
    imageUrl: string;
  };
}

interface Order {
  id: number;
  userId: string;
  totalAmountCents: number;

  status: "pending" | "confirmed" | "delivered" | "cancelled";

  createdAt: string;

  customerEmail: string;
  shippingAddress: string;
  contactPhone: string;

  items: OrderItem[];

  user: {
    id: string;
    email: string;
  };
}

interface AdminOrderCardProps {
  order: Order;

  onStatusChange: (
    orderId: number,
    status: "confirmed" | "delivered" | "cancelled",
  ) => Promise<void>;
}

export default function AdminOrderCard({
  order,
  onStatusChange,
}: AdminOrderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [targetStatus, setTargetStatus] = useState<
    "confirmed" | "delivered" | "cancelled" | null
  >(null);

  async function handleConfirm() {
    if (!targetStatus) return;

    await onStatusChange(order.id, targetStatus);

    setConfirmOpen(false);
    setTargetStatus(null);
  }

  function requestStatusChange(
    status: "confirmed" | "delivered" | "cancelled",
  ) {
    setTargetStatus(status);
    setConfirmOpen(true);
  }

  return (
    <>
      <Card className="mb-3">
        <div className="flex-between">
          <div>
            <h3>Order #{order.id}</h3>

            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
          </div>

          <Badge variant={order.status}>{order.status.toUpperCase()}</Badge>
        </div>

        <div className="mt-3">
          <p>
            <strong>Customer:</strong> {order.customerEmail}
          </p>

          <p>
            <strong>Shipping:</strong> {order.shippingAddress}
          </p>

          <p>
            <strong>Phone:</strong> {order.contactPhone}
          </p>

          <p className="mt-2">
            <strong>Total:</strong> ₱{(order.totalAmountCents / 100).toFixed(2)}
          </p>
        </div>

        <div
          className="mt-3"
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {order.status === "pending" && (
            <>
              <Button onClick={() => requestStatusChange("confirmed")}>
                Confirm
              </Button>

              <Button onClick={() => requestStatusChange("delivered")}>
                Deliver
              </Button>

              <Button
                variant="danger"
                onClick={() => requestStatusChange("cancelled")}
              >
                Cancel
              </Button>
            </>
          )}

          {order.status === "confirmed" && (
            <>
              <Button onClick={() => requestStatusChange("delivered")}>
                Deliver
              </Button>

              <Button
                variant="danger"
                onClick={() => requestStatusChange("cancelled")}
              >
                Cancel
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide Items" : "View Items"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3">
            {order.items.map((item) => (
              <Card key={item.id} className="mb-2">
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    style={{
                      width: "75px",
                      height: "75px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />

                  <div>
                    <h4>{item.product.name}</h4>

                    <p>Qty: {item.quantity}</p>

                    <p>₱{(item.priceAtPurchaseCents / 100).toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Action"
        message={`Change order #${order.id} to "${targetStatus}"?`}
        confirmText="Confirm"
        cancelText="Cancel"
        danger={targetStatus === "cancelled"}
      />
    </>
  );
}
