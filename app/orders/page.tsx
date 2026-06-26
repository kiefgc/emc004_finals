"use client";

import { useEffect, useState } from "react";

import Navbar from "@/app/components/layout/Navbar";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
import Badge from "@/app/components/ui/Badge";
import BackButton from "@/app/components/navigation/BackButton";
// Imported the ConfirmModal
import ConfirmModal from "@/app/components/ui/ConfirmModal";

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
}

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  priceAtPurchaseCents: number;
  product: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // States to manage the modal interaction
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const response = await fetch("/api/orders", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(orderId: number) {
    setCancelling(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
        }),
      });

      const updatedOrder = await response.json();

      if (!response.ok) {
        alert(updatedOrder.error || "Unable to cancel order");
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: updatedOrder.status,
              }
            : order,
        ),
      );

      // Close the modal upon success
      setOrderToCancel(null);
    } catch (error) {
      console.error(error);
    } finally {
      setCancelling(false);
    }
  }

  function toggleExpanded(orderId: number) {
    setExpanded((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  if (loading) {
    return <main className="container section">Loading orders...</main>;
  }

  return (
    <main className="container section">
      <BackButton href="/" label="Back to Home" />
      <h1 className="mb-4">My Orders</h1>

      {orders.length === 0 && <Card>You haven't placed any orders yet.</Card>}

      {orders.map((order) => (
        <Card key={order.id} className="mb-3">
          <div className="flex-between">
            <div>
              <h3>Order ID: {order.id}</h3>

              <p>{new Date(order.createdAt).toLocaleString()}</p>

              <p>Total: ₱{(order.totalAmountCents / 100).toFixed(2)}</p>
            </div>

            <Badge variant={order.status}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => toggleExpanded(order.id)}
            >
              {expanded.includes(order.id) ? "Hide Details" : "View Details"}
            </Button>
          </div>

          {expanded.includes(order.id) && (
            <>
              <div className="mt-3">
                <h3>Items</h3>

                {order.items.map((item) => (
                  <Card key={item.id} className="mt-2">
                    <div
                      className="flex"
                      style={{
                        gap: "1rem",
                      }}
                    >
                      <img src={item.product.imageUrl} width="80" />

                      <div>
                        <h4>{item.product.name}</h4>

                        <p>Qty: {item.quantity}</p>

                        <p>₱{(item.priceAtPurchaseCents / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-3">
                <p>
                  <strong>Email:</strong> {order.customerEmail}
                </p>

                <p>
                  <strong>Phone:</strong> {order.contactPhone}
                </p>

                <p>
                  <strong>Address:</strong> {order.shippingAddress}
                </p>
              </div>

              {order.status === "pending" && (
                <div className="mt-3">
                  {/* Clicking this now sets the active ID, triggering the modal */}
                  <Button
                    variant="danger"
                    onClick={() => setOrderToCancel(order.id)}
                  >
                    Cancel Order
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      ))}

      {/* Shared single modal implementation sitting comfortably at the bottom */}
      <ConfirmModal
        open={orderToCancel !== null}
        title={`Cancel Order #${orderToCancel}`}
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText={cancelling ? "Cancelling..." : "Yes, Cancel Order"}
        danger
        onCancel={() => setOrderToCancel(null)}
        onConfirm={() => {
          if (orderToCancel !== null) {
            cancelOrder(orderToCancel);
          }
        }}
      />
    </main>
  );
}
