// prisma/seed.ts
import "dotenv/config";
import pg from "pg";
import bcryptjs from "bcryptjs"; // For hashing passwords if needed in the future
import { randomUUID } from "crypto"; // Native Node.js module to generate UUIDs

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
        // 1. Seed Roles
        console.log("Seeding security roles...");
        const adminRoleRes = await client.query(`
      INSERT INTO "roles" (name) 
      VALUES ('ADMIN')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);

        const adminRoleId = adminRoleRes.rows[0]?.id;

        await client.query(`
      INSERT INTO "roles" (name) 
      VALUES ('USER')
      ON CONFLICT (name) DO NOTHING;
    `);

        // 2. Seed Admin User (Explicitly passing generated UUID)
        if (adminRoleId) {
            console.log("Seeding default administrator...");
            const adminUuid = randomUUID(); // Generates a clean v4 UUID string
            const hashedPassword = await bcryptjs.hash(
                "SuperSecureHashedPassword123!",
                10,
            );

            await client.query(
                `
        INSERT INTO "users" (id, email, "password_hash", "role_id") 
        VALUES ($1, 'admin@meraki.com', $3, $2)
        ON CONFLICT (email) DO NOTHING;
        `,
                [adminUuid, adminRoleId, hashedPassword], // Passed securely as parameter $3
            );
        }

        // 3. Seed Products (Safe lookup fallback instead of ON CONFLICT)
        console.log("Seeding initial products inventory...");
        const products = [
            {
                name: "Creative UI Pro Kit",
                price_cents: 2999,
                description: "Premium Next.js design component frames.",
                stock: 50,
            },
            {
                name: "Vector Asset Pack v1",
                price_cents: 1500,
                description: "Handcrafted custom stickers and mascot vectors.",
                stock: 100,
            },
            {
                name: "Digital Art Brushset",
                price_cents: 1999,
                description: "Custom texturing tools for illustrators.",
                stock: 75,
            },
        ];

        for (const item of products) {
            // Check if the product already exists by name first
            const existingProduct = await client.query(
                'SELECT id FROM "products" WHERE name = $1 LIMIT 1;',
                [item.name],
            );

            if (existingProduct.rows.length === 0) {
                // If it doesn't exist, safely insert it
                await client.query(
                    `
          INSERT INTO "products" (name, "price_cents", description, "stock_quantity")
          VALUES ($1, $2, $3, $4);
        `,
                    [item.name, item.price_cents, item.description, item.stock],
                );
            } else {
                console.log(
                    ` -> Product "${item.name}" already exists, skipping.`,
                );
            }
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
