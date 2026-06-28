"use client";

import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";

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

interface ProductManagementCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductManagementCard({
  product,
  onEdit,
  onDelete,
}: ProductManagementCardProps) {
  return (
    <Card className="w-full">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="product-image"
      />

      <h3>{product.name}</h3>

      <p className="mt-1">{product.description}</p>

      <div className="product-price">
        ₱{(product.priceCents / 100).toFixed(2)}
      </div>

      <p className="stock">Stock Available: {product.stockQuantity}</p>

      <p
        className="mt-1"
        style={{
          color: "var(--text-muted)",
          fontSize: "0.9rem",
        }}
      >
        Supplier: {product.supplierName}
      </p>

      <p
        className="mt-1"
        style={{
          color: "var(--text-muted)",
          fontSize: "0.85rem",
        }}
      >
        Created: {new Date(product.createdAt).toLocaleDateString()}
      </p>

      <div
        className="mt-3"
        style={{
          display: "flex",
          gap: "0.75rem",
        }}
      >
        <Button variant="secondary" onClick={() => onEdit(product)}>
          Edit
        </Button>

        <Button variant="danger" onClick={() => onDelete(product)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
