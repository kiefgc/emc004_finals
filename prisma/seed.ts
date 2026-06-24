import "dotenv/config";
import pg from "pg";
import bcryptjs from "bcryptjs";
import { randomUUID } from "crypto";

const { Client } = pg;

let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "Error: Neither DIRECT_URL nor DATABASE_URL was found in your .env file.",
  );
  process.exit(1);
}

if (connectionString.includes("?")) {
  connectionString = connectionString.split("?")[0];
}

async function main() {
  console.log("🌱 Starting direct database seeding via PostgreSQL driver...");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // ------------------------------------------------------------------
    // 1. Roles
    // ------------------------------------------------------------------
    console.log("Seeding security roles...");
    const adminRoleRes = await client.query(`
      INSERT INTO "roles" (name) 
      VALUES ('ADMIN')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const adminRoleId = adminRoleRes.rows[0]?.id;

    const userRoleRes = await client.query(`
      INSERT INTO "roles" (name) 
      VALUES ('USER')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const userRoleId = userRoleRes.rows[0]?.id;

    // ------------------------------------------------------------------
    // 2. Users (1 admin + 3 regular test users)
    // ------------------------------------------------------------------
    const sharedPassword = await bcryptjs.hash(
      "SuperSecureHashedPassword123!",
      10,
    );

    const usersToSeed = [
      {
        email: "admin@meraki.com",
        roleId: adminRoleId,
        label: "administrator",
      },
      { email: "alice@example.com", roleId: userRoleId, label: "test user" },
      { email: "bob@example.com", roleId: userRoleId, label: "test user" },
      { email: "carol@example.com", roleId: userRoleId, label: "test user" },
    ];

    // email -> id, so we can reference users later for carts/orders
    const userIdByEmail: Record<string, string> = {};

    console.log("Seeding users...");
    for (const u of usersToSeed) {
      if (!u.roleId) continue;

      const existing = await client.query(
        `SELECT id FROM "users" WHERE email = $1 LIMIT 1;`,
        [u.email],
      );

      if (existing.rows.length > 0) {
        userIdByEmail[u.email] = existing.rows[0].id;
        console.log(` -> User "${u.email}" already exists, skipping insert.`);
        continue;
      }

      const newId = randomUUID();
      await client.query(
        `
        INSERT INTO "users" (id, email, "password_hash", "role_id") 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
        `,
        [newId, u.email, sharedPassword, u.roleId],
      );
      userIdByEmail[u.email] = newId;
      console.log(` -> Created ${u.label} "${u.email}".`);
    }

    // ------------------------------------------------------------------
    // 3. Products
    // ------------------------------------------------------------------
    console.log("Seeding initial products inventory...");
    const products = [
      {
        name: "Creative UI Pro Kit",
        price_cents: 2999,
        description: "Premium Next.js design component frames.",
        stock: 50,
        supplier: "PixelForge Studio",
        image_url: "https://placehold.co/600x400?text=UI+Pro+Kit",
      },
      {
        name: "Vector Asset Pack v1",
        price_cents: 1500,
        description: "Handcrafted custom stickers and mascot vectors.",
        stock: 100,
        supplier: "PixelForge Studio",
        image_url: "https://placehold.co/600x400?text=Vector+Pack",
      },
      {
        name: "Digital Art Brushset",
        price_cents: 1999,
        description: "Custom texturing tools for illustrators.",
        stock: 75,
        supplier: "InkWell Co.",
        image_url: "https://placehold.co/600x400?text=Brushset",
      },
      {
        name: "Icon Library Mega Bundle",
        price_cents: 3499,
        description: "2,000+ pixel-perfect SVG icons for product UIs.",
        stock: 40,
        supplier: "InkWell Co.",
        image_url: "https://placehold.co/600x400?text=Icon+Bundle",
      },
      {
        name: "Mockup Template Collection",
        price_cents: 2499,
        description: "Device and print mockups for portfolio presentations.",
        stock: 60,
        supplier: "PixelForge Studio",
        image_url: "https://placehold.co/600x400?text=Mockups",
      },
      {
        name: "Typography Starter Pack",
        price_cents: 999,
        description: "Curated font pairings with licensing for commercial use.",
        stock: 0,
        supplier: "Glyphworks",
        image_url: "https://placehold.co/600x400?text=Typography",
      },
    ];

    // name -> id, so we can reference products later for cart/order items
    const productIdByName: Record<string, number> = {};

    for (const item of products) {
      const existingProduct = await client.query(
        'SELECT id FROM "products" WHERE name = $1 LIMIT 1;',
        [item.name],
      );

      if (existingProduct.rows.length === 0) {
        const inserted = await client.query(
          `
          INSERT INTO "products" (name, "price_cents", description, "stock_quantity", "supplier_name", "image_url")
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `,
          [
            item.name,
            item.price_cents,
            item.description,
            item.stock,
            item.supplier,
            item.image_url,
          ],
        );
        productIdByName[item.name] = inserted.rows[0].id;
      } else {
        productIdByName[item.name] = existingProduct.rows[0].id;
        console.log(` -> Product "${item.name}" already exists, skipping.`);
      }
    }

    // ------------------------------------------------------------------
    // 4. Shopping carts + cart items (for Alice and Bob, not Carol)
    // ------------------------------------------------------------------
    console.log("Seeding shopping carts...");

    const cartSeeds = [
      {
        email: "alice@example.com",
        items: [
          { product: "Creative UI Pro Kit", quantity: 1 },
          { product: "Icon Library Mega Bundle", quantity: 2 },
        ],
      },
      {
        email: "bob@example.com",
        items: [{ product: "Digital Art Brushset", quantity: 1 }],
      },
    ];

    for (const cartSeed of cartSeeds) {
      const userId = userIdByEmail[cartSeed.email];
      if (!userId) continue;

      const cartRes = await client.query(
        `
        INSERT INTO "shopping_carts" ("user_id")
        VALUES ($1)
        ON CONFLICT ("user_id") DO UPDATE SET "user_id" = EXCLUDED."user_id"
        RETURNING id;
        `,
        [userId],
      );
      const cartId = cartRes.rows[0].id;

      for (const cartItem of cartSeed.items) {
        const productId = productIdByName[cartItem.product];
        if (!productId) continue;

        await client.query(
          `
          INSERT INTO "cart_items" ("cart_id", "product_id", quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT ("cart_id", "product_id") DO UPDATE SET quantity = EXCLUDED.quantity;
          `,
          [cartId, productId, cartItem.quantity],
        );
      }
      console.log(` -> Cart seeded for "${cartSeed.email}".`);
    }

    // ------------------------------------------------------------------
    // 5. Orders + order items
    //    One order tied to a registered user, one guest checkout order.
    // ------------------------------------------------------------------
    console.log("Seeding orders...");

    const orderSeeds = [
      {
        email: "carol@example.com", // registered user order
        userEmail: "carol@example.com",
        customerEmail: "carol@example.com",
        shippingAddress: "123 Maple Street, Springfield, IL 62704",
        contactPhone: "+1-555-0100",
        status: "completed",
        items: [
          { product: "Mockup Template Collection", quantity: 1 },
          { product: "Vector Asset Pack v1", quantity: 3 },
        ],
      },
    ];

    for (const orderSeed of orderSeeds) {
      // Idempotency guard: skip if an order with this exact customer email
      // and status already exists (good enough for repeatable seeding).
      const existingOrder = await client.query(
        `SELECT id FROM "orders" WHERE "customer_email" = $1 AND status = $2 LIMIT 1;`,
        [orderSeed.customerEmail, orderSeed.status],
      );

      if (existingOrder.rows.length > 0) {
        console.log(
          ` -> Order for "${orderSeed.customerEmail}" already exists, skipping.`,
        );
        continue;
      }

      const linkedUserId = orderSeed.userEmail
        ? (userIdByEmail[orderSeed.userEmail] ?? null)
        : null;

      let totalAmountCents = 0;
      const resolvedItems: {
        productId: number;
        quantity: number;
        priceCents: number;
      }[] = [];

      for (const item of orderSeed.items) {
        const productId = productIdByName[item.product];
        if (!productId) continue;

        const productRow = await client.query(
          `SELECT "price_cents" FROM "products" WHERE id = $1 LIMIT 1;`,
          [productId],
        );
        const priceCents = productRow.rows[0]?.price_cents ?? 0;

        totalAmountCents += priceCents * item.quantity;
        resolvedItems.push({ productId, quantity: item.quantity, priceCents });
      }

      const orderRes = await client.query(
        `
        INSERT INTO "orders"
          ("user_id", "total_amount_cents", status, "customer_email", "shipping_address", "contact_phone")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
        `,
        [
          linkedUserId,
          totalAmountCents,
          orderSeed.status,
          orderSeed.customerEmail,
          orderSeed.shippingAddress,
          orderSeed.contactPhone,
        ],
      );
      const orderId = orderRes.rows[0].id;

      for (const resolvedItem of resolvedItems) {
        await client.query(
          `
          INSERT INTO "order_items"
            ("order_id", "product_id", quantity, "price_at_purchase_cents")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("order_id", "product_id") DO NOTHING;
          `,
          [
            orderId,
            resolvedItem.productId,
            resolvedItem.quantity,
            resolvedItem.priceCents,
          ],
        );
      }

      console.log(
        ` -> Order for "${orderSeed.customerEmail}" created with ${resolvedItems.length} item(s).`,
      );
    }

    console.log("Seeding finished successfully!");
  } catch (error) {
    console.error("Error executing database queries:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
