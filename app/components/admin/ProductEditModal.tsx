// app/components/admin/ProductEditModal.tsx

"use client";

import { useEffect, useState } from "react";

import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";

interface Product {
  id: number;
  name: string;
  priceCents: number;
  stockQuantity: number;
}

interface ProductEditModalProps {
  open: boolean;
  product: Product | null;
  loading?: boolean;

  onClose: () => void;

  onSave: (
    productId: number,
    priceCents: number,
    stockQuantity: number,
  ) => Promise<void>;
}

export default function ProductEditModal({
  open,
  product,
  loading = false,
  onClose,
  onSave,
}: ProductEditModalProps) {
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  useEffect(() => {
    if (!product) return;

    setPrice((product.priceCents / 100).toString());
    setStock(product.stockQuantity.toString());
  }, [product]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!product) return;

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      alert("Invalid price.");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      alert("Invalid stock quantity.");
      return;
    }

    await onSave(product.id, Math.round(parsedPrice * 100), parsedStock);
  }

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="modal-header">
        <h2>Edit Product</h2>
      </div>

      <div className="modal-body">
        {product && (
          <>
            <p className="mb-3">
              Editing:
              <br />
              <strong>{product.name}</strong>
            </p>

            <form onSubmit={handleSubmit}>
              <div className="auth-group">
                <label>Price (₱)</label>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="auth-group">
                <label>Stock Quantity</label>

                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <div
                className="mt-3"
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <Button variant="secondary" onClick={onClose} type="button">
                  Cancel
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
