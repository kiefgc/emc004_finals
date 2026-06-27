import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";
import AdminStatCard from "@/app/components/admin/AdminStatCard";
import Button from "@/app/components/ui/Button";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getCurrentUser() {
  const cookieStore = await cookies();

  const response = await fetch(`${BASE_URL}/api/authentication/me`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getProducts() {
  const response = await fetch(`${BASE_URL}/api/products`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function getOrders(cookieHeader: string) {
  const response = await fetch(`${BASE_URL}/api/orders`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();

  const user = await getCurrentUser();

  if (!user || user.role?.name !== "ADMIN") {
    redirect("/");
  }

  const [products, orders] = await Promise.all([
    getProducts(),
    getOrders(cookieStore.toString()),
  ]);

  const totalProducts = products.length;

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order: any) => order.status === "pending",
  ).length;

  const revenue = orders
    .filter((order: any) => order.status === "delivered")
    .reduce((total: number, order: any) => total + order.totalAmountCents, 0);

  return (
    <>
      <Navbar user={user} />

      <main className="section">
        <div className="container">
          <div className="section-header">
            <h1>Admin Dashboard</h1>

            <p>Overview of products, orders, and revenue.</p>
          </div>

          <div className="grid grid-products">
            <AdminStatCard title="Products" value={totalProducts} />

            <AdminStatCard title="Orders" value={totalOrders} />

            <AdminStatCard title="Pending Orders" value={pendingOrders} />

            <AdminStatCard
              title="Revenue"
              value={`₱${(revenue / 100).toFixed(2)}`}
            />
          </div>

          <div
            className="mt-4"
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <a href="/admin/products">
              <Button>Manage Products</Button>
            </a>

            <a href="/admin/orders">
              <Button variant="secondary">Manage Orders</Button>
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
