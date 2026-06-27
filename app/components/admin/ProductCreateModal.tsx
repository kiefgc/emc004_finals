"use client";

import { useState } from "react";

import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";

interface ProductCreateModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;

  // Updated signature type keys to match your exact backend parameter keys
  onCreate: (product: {
    name: string;
    description: string | null;
    price: number;
    stock: number;
    supplierName: string | null;
    imageUrl: string | null;
  }) => Promise<void>;
}

export default function ProductCreateModal({
  open,
  loading = false,
  onClose,
  onCreate,
}: ProductCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setSupplierName("");
    setImageUrl("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (name.trim().length === 0) {
      alert("Product name is required.");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      alert("Invalid price.");
      return;
    }

    const priceString = parsedPrice.toString();
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    if (!decimalRegex.test(priceString)) {
      alert("Price cannot have more than 2 decimal places.");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      alert("Invalid stock quantity.");
      return;
    }

    // Pass structured keys straight through matching the exact API endpoint names
    await onCreate({
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice, // Passes the raw numeric decimal value (e.g. 149.99)
      stock: parsedStock, // Passes integer format variable name
      supplierName: supplierName.trim() || null,
      imageUrl: imageUrl.trim() || null,
    });

    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={handleClose}>
      <div className="modal-header">
        <h2>Create Product</h2>
      </div>

      <div className="modal-body">
        <form onSubmit={handleSubmit}>
          <div className="auth-group">
            <label>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="auth-group">
            <label>Description</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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

          <div className="auth-group">
            <label>Supplier Name</label>
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div className="auth-group">
            <label>Image URL</label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
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
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
