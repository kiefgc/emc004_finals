"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";

import AdminStatCard from "@/app/components/admin/AdminStatCard";
import AdminOrderCard from "@/app/components/admin/AdminOrderCard";

import BackButton from "@/app/components/navigation/BackButton";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface Order {
  id: number;

  userId: string;

  totalAmountCents: number;

  status: "pending" | "confirmed" | "delivered" | "cancelled";

  createdAt: string;

  customerEmail: string;
  shippingAddress: string;
  contactPhone: string;

  items: any[];

  user: {
    id: string;
    email: string;
  };
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    const response = await fetch(`${BASE_URL}/api/authentication/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.push("/");
      return;
    }

    const data = await response.json();

    if (data.role?.name !== "ADMIN") {
      router.push("/");
      return;
    }

    setUser(data);
  }

  async function fetchOrders() {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    setOrders(data);
  }

  useEffect(() => {
    async function initialize() {
      await fetchUser();
      await fetchOrders();

      setLoading(false);
    }

    initialize();
  }, []);

  async function handleStatusChange(
    orderId: number,
    status: "confirmed" | "delivered" | "cancelled",
  ) {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      method: "PATCH",

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      alert(error.error ?? "Failed to update order");

      return;
    }

    await fetchOrders();
  }

  if (loading) {
    return <div className="container section">Loading...</div>;
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const confirmedOrders = orders.filter((o) => o.status === "confirmed").length;

  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

  const deliveredRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((total, order) => total + order.totalAmountCents, 0);

  return (
    <>
      <Navbar user={user} />

      <main className="section">
        <div className="container">
          <BackButton href="/admin" label="Back to Admin Dashboard" />
          <div className="section-header">
            <h1>Order Management</h1>

            <p>Review and manage customer orders.</p>
          </div>

          <div className="grid grid-products mb-4">
            <AdminStatCard title="Pending" value={pendingOrders} />

            <AdminStatCard title="Confirmed" value={confirmedOrders} />

            <AdminStatCard title="Delivered" value={deliveredOrders} />

            <AdminStatCard title="Cancelled" value={cancelledOrders} />

            <AdminStatCard
              title="Revenue"
              value={`₱${(deliveredRevenue / 100).toFixed(2)}`}
            />
          </div>

          {orders.length === 0 ? (
            <div className="card text-center">
              <h2>No orders found</h2>

              <p>Orders will appear here once customers begin checking out.</p>
            </div>
          ) : (
            orders.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </main>
    </>
  );
}
