"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";

import ProductManagementCard from "@/app/components/admin/ProductManagementCard";
import ProductCreateModal from "@/app/components/admin/ProductCreateModal";
import ProductEditModal from "@/app/components/admin/ProductEditModal";

import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Button from "@/app/components/ui/Button";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  stockQuantity: number;
  supplierName: string;
  imageUrl: string;
  createdAt: string;
}

export default function AdminProductsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  async function fetchCurrentUser() {
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

  async function fetchProducts() {
    const response = await fetch(`${BASE_URL}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setProducts(data);
  }

  useEffect(() => {
    async function initialize() {
      await fetchCurrentUser();
      await fetchProducts();
      setPageLoading(false);
    }

    initialize();
  }, []);

  async function handleCreate(productData: {
    name: string;
    description: string | null;
    price: number;
    stock: number;
    supplierName: string | null;
    imageUrl: string | null;
  }) {
    setActionLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error ?? "Failed to create product");
        return;
      }

      setCreateOpen(false);
      await fetchProducts();
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEdit(
    id: number,
    updates: {
      priceCents: number;
      stockQuantity: number;
    },
  ) {
    setActionLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error ?? "Failed to update product");
        return;
      }

      setEditOpen(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedProduct) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/products/${selectedProduct.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error ?? "Failed to delete product");
        return;
      }

      setDeleteOpen(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  }

  if (pageLoading) {
    return <div className="container section">Loading...</div>;
  }

  const inventoryUnits = products.reduce(
    (total, product) => total + product.stockQuantity,
    0,
  );

  const inventoryValue = products.reduce(
    (total, product) => total + product.stockQuantity * product.priceCents,
    0,
  );

  return (
    <>
      <Navbar user={user} />

      <main className="section">
        <div className="container">
          <div className="flex-between mb-4">
            <div>
              <h1>Product Management</h1>
              <p>Create, edit, and remove products.</p>
            </div>

            <Button onClick={() => setCreateOpen(true)}>Create Product</Button>
          </div>

          <div
            className="card mb-4"
            style={{
              display: "flex",
              gap: "2rem",
            }}
          >
            <div>
              <strong>Products</strong>
              <p>{products.length}</p>
            </div>

            <div>
              <strong>Inventory Units</strong>
              <p>{inventoryUnits}</p>
            </div>

            <div>
              <strong>Inventory Value</strong>
              <p>₱{(inventoryValue / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-products">
            {products.map((product) => (
              <ProductManagementCard
                key={product.id}
                product={product}
                onEdit={() => {
                  setSelectedProduct(product);
                  setEditOpen(true);
                }}
                onDelete={() => {
                  setSelectedProduct(product);
                  setDeleteOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </main>

      <ProductCreateModal
        open={createOpen}
        loading={actionLoading}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {selectedProduct && (
        <ProductEditModal
          open={editOpen}
          product={selectedProduct}
          onClose={() => {
            setEditOpen(false);
            setSelectedProduct(null);
          }}
          onSave={(productId, priceCents, stockQuantity) =>
            handleEdit(productId, { priceCents, stockQuantity })
          }
        />
      )}

      <ConfirmModal
        open={deleteOpen}
        title="Delete Product"
        message={`Delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText={actionLoading ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
