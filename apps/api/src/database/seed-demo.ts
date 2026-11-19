import { db } from "./database.js";
import type { OrderStatus } from "./types/orders.js";
import type { PaymentMethod } from "./types/payments.js";

const ADMIN_EMAIL = "admin@mealware.local";

const DEMO_CATEGORIES = [
  "Hamburguesas",
  "Acompañamientos",
  "Bebidas",
  "Postres",
] as const;

const DEMO_MENU_ITEMS = [
  {
    name: "Hamburguesa clásica",
    description: "Carne, cheddar, lechuga, tomate y salsa especial.",
    price: "8500.00",
    category: "Hamburguesas",
  },
  {
    name: "Hamburguesa doble cheddar",
    description: "Doble carne y doble cheddar.",
    price: "10500.00",
    category: "Hamburguesas",
  },
  {
    name: "Hamburguesa bacon",
    description: "Carne, cheddar, panceta y salsa BBQ.",
    price: "11000.00",
    category: "Hamburguesas",
  },
  {
    name: "Hamburguesa completa",
    description: "Carne, cheddar, jamón, huevo y vegetales.",
    price: "12000.00",
    category: "Hamburguesas",
  },
  {
    name: "Hamburguesa vegetariana",
    description: "Medallón vegetal, cheddar y vegetales frescos.",
    price: "9500.00",
    category: "Hamburguesas",
  },
  {
    name: "Papas fritas",
    description: "Porción clásica de papas fritas.",
    price: "4500.00",
    category: "Acompañamientos",
  },
  {
    name: "Papas con cheddar",
    description: "Papas fritas con cheddar fundido.",
    price: "6000.00",
    category: "Acompañamientos",
  },
  {
    name: "Aros de cebolla",
    description: "Porción de aros de cebolla crocantes.",
    price: "5000.00",
    category: "Acompañamientos",
  },
  {
    name: "Nuggets",
    description: "Porción de nuggets de pollo.",
    price: "5500.00",
    category: "Acompañamientos",
  },
  {
    name: "Gaseosa chica",
    description: "Gaseosa de 500 ml.",
    price: "2500.00",
    category: "Bebidas",
  },
  {
    name: "Gaseosa grande",
    description: "Gaseosa de 1.5 litros.",
    price: "4000.00",
    category: "Bebidas",
  },
  {
    name: "Agua mineral",
    description: "Agua mineral de 500 ml.",
    price: "2000.00",
    category: "Bebidas",
  },
  {
    name: "Limonada",
    description: "Limonada natural.",
    price: "3000.00",
    category: "Bebidas",
  },
  {
    name: "Brownie",
    description: "Brownie de chocolate.",
    price: "4000.00",
    category: "Postres",
  },
  {
    name: "Helado",
    description: "Dos bochas de helado.",
    price: "3500.00",
    category: "Postres",
  },
  {
    name: "Cheesecake",
    description: "Porción de cheesecake.",
    price: "5000.00",
    category: "Postres",
  },
] as const;

const ORDER_STATUSES: OrderStatus[] = [
  ...Array.from({ length: 8 }, () => "PENDING" as const),
  ...Array.from({ length: 7 }, () => "PREPARING" as const),
  ...Array.from({ length: 5 }, () => "READY" as const),
  ...Array.from({ length: 45 }, () => "COMPLETED" as const),
  ...Array.from({ length: 15 }, () => "CANCELLED" as const),
];

const CUSTOMER_NAMES = [
  "Juan Pérez",
  "María González",
  "Lucas Rodríguez",
  "Sofía Fernández",
  "Martín López",
  "Camila García",
  "Tomás Martínez",
  "Valentina Romero",
  "Nicolás Torres",
  "Lucía Díaz",
  "Mateo Álvarez",
  "Julieta Sánchez",
  "Santiago Ramírez",
  "Agustina Flores",
  "Benjamín Acosta",
  "Micaela Ruiz",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "TRANSFER",
];

const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

const getArgentinaDate = (daysAgo: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  const day = Number(parts.find((part) => part.type === "day")!.value);

  const date = new Date(Date.UTC(year, month - 1, day - daysAgo));

  return date.toISOString().slice(0, 10);
};

const getOrderTimestamp = (date: string, index: number) => {
  const hour = 11 + ((index * 5) % 11);
  const minute = (index * 17) % 60;

  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`,
  );
};

const getMoneyInCents = (amount: string) => {
  const [integerPart, decimalPart = ""] = amount.split(".");

  return (
    Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0").slice(0, 2))
  );
};

const formatMoney = (amountInCents: number) => (amountInCents / 100).toFixed(2);

const getTransactionTimestamp = (date: string, hour: number, minute: number) =>
  new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`,
  );

// Normalize PostgreSQL date values before using them as map keys.
const getOrderDateKey = (date: string | Date) =>
  date instanceof Date ? date.toISOString().slice(0, 10) : date.slice(0, 10);

const seedDemo = async () => {
  await db.transaction().execute(async (trx) => {
    // Find the initial administrator and its restaurant.
    const admin = await trx
      .selectFrom("users")
      .select(["id", "restaurant_id"])
      .where("email", "=", ADMIN_EMAIL)
      .executeTakeFirst();

    if (!admin) {
      throw new Error(
        `Administrator ${ADMIN_EMAIL} was not found. Run the initial seed first.`,
      );
    }

    const { id: adminId, restaurant_id: restaurantId } = admin;

    // Check whether the restaurant already contains data.
    const existingMenuItem = await trx
      .selectFrom("menu_items")
      .select("id")
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirst();

    const existingOrder = await trx
      .selectFrom("orders")
      .select("id")
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirst();

    const existingSequence = await trx
      .selectFrom("order_sequences")
      .select("restaurant_id")
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirst();

    if (existingMenuItem || existingOrder || existingSequence) {
      console.log(
        "Demo seed skipped: the administrator's restaurant already contains data.",
      );
      return;
    }

    // Find existing global categories or create missing ones.
    const existingCategories = await trx
      .selectFrom("categories")
      .select(["id", "name"])
      .execute();

    const categoryIds = new Map<string, string>(
      existingCategories.map((category) => [
        normalizeName(category.name),
        category.id,
      ]),
    );

    for (const categoryName of DEMO_CATEGORIES) {
      const normalizedName = normalizeName(categoryName);

      if (categoryIds.has(normalizedName)) {
        continue;
      }

      const category = await trx
        .insertInto("categories")
        .values({
          name: categoryName,
          created_by: adminId,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      categoryIds.set(normalizedName, category.id);
    }

    // Create the demo menu items.
    const menuItems = await trx
      .insertInto("menu_items")
      .values(
        DEMO_MENU_ITEMS.map((item) => {
          const categoryId = categoryIds.get(normalizeName(item.category));

          if (!categoryId) {
            throw new Error(`Category not found: ${item.category}`);
          }

          return {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
          };
        }),
      )
      .returning(["id", "name", "price"])
      .execute();

    // Generate 80 orders distributed across the last 30 days.
    const orderDefinitions = Array.from({ length: 80 }, (_, index) => {
      const daysAgo = 1 + ((index * 7) % 30);
      const orderDate = getArgentinaDate(daysAgo);

      const itemCount = 1 + (index % 4);
      const selectedItems = new Set<number>();

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
        selectedItems.add((index * 3 + itemIndex * 5) % menuItems.length);
      }

      const items = [...selectedItems].map((menuItemIndex, itemIndex) => {
        const menuItem = menuItems[menuItemIndex];

        return {
          menu_item_id: menuItem.id,
          name: menuItem.name,
          unit_price: menuItem.price,
          quantity: 1 + ((index + itemIndex) % 3),
        };
      });

      return {
        index,
        orderDate,
        createdAt: getOrderTimestamp(orderDate, index),
        type: index % 2 === 0 ? ("DINE_IN" as const) : ("TAKEAWAY" as const),
        status: ORDER_STATUSES[index],
        customerName: CUSTOMER_NAMES[index % CUSTOMER_NAMES.length],
        items,
      };
    });

    // Calculate the number of orders for each date.
    const ordersPerDate = new Map<string, number>();

    for (const definition of orderDefinitions) {
      ordersPerDate.set(
        definition.orderDate,
        (ordersPerDate.get(definition.orderDate) ?? 0) + 1,
      );
    }

    // Initialize the daily order sequences.
    await trx
      .insertInto("order_sequences")
      .values(
        [...ordersPerDate.entries()].map(([date, lastNumber]) => ({
          restaurant_id: restaurantId,
          date,
          last_number: lastNumber,
        })),
      )
      .execute();

    // Assign consecutive order numbers for each date.
    const dailyOrderNumbers = new Map<string, number>();

    const ordersToInsert = orderDefinitions.map((definition) => {
      const orderNumber =
        (dailyOrderNumbers.get(definition.orderDate) ?? 0) + 1;

      dailyOrderNumbers.set(definition.orderDate, orderNumber);

      return {
        restaurant_id: restaurantId,
        order_number: orderNumber,
        order_date: definition.orderDate,
        type: definition.type,
        status: definition.status,
        customer_name: definition.customerName,
        notes: null,
        created_by: adminId,
        created_at: definition.createdAt,
      };
    });

    // Create the demo orders.
    const orders = await trx
      .insertInto("orders")
      .values(ordersToInsert)
      .returning(["id", "order_date", "order_number"])
      .execute();

    // Match each generated order with its corresponding items.
    const definitionsByOrder = new Map(
      orderDefinitions.map((definition) => {
        const orderNumber = orderDefinitions
          .slice(0, definition.index + 1)
          .filter(
            (previous) => previous.orderDate === definition.orderDate,
          ).length;

        return [`${definition.orderDate}:${orderNumber}`, definition];
      }),
    );

    const orderItems = orders.flatMap((order) => {
      const definition = definitionsByOrder.get(
        `${getOrderDateKey(order.order_date)}:${order.order_number}`,
      );

      if (!definition) {
        throw new Error(
          `Could not find demo order definition for order ${order.id}.`,
        );
      }

      return definition.items.map((item) => ({
        restaurant_id: restaurantId,
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        notes: null,
      }));
    });

    // Create the demo order items.
    await trx.insertInto("order_items").values(orderItems).execute();

    // Prepare payment definitions for READY and COMPLETED orders.
    const paymentsToCreate: {
      orderId: string;
      method: PaymentMethod;
      amount: string;
      createdAt: Date;
      refundAmount: string | null;
    }[] = [];

    for (const order of orders) {
      const definition = definitionsByOrder.get(
        `${getOrderDateKey(order.order_date)}:${order.order_number}`,
      );

      if (!definition) {
        throw new Error(`Order definition not found for ${order.id}.`);
      }

      if (definition.status !== "READY" && definition.status !== "COMPLETED") {
        continue;
      }

      // Calculate the order total using integer cents.
      const orderTotal = definition.items.reduce(
        (total, item) =>
          total + getMoneyInCents(item.unit_price) * item.quantity,
        0,
      );

      // Some READY orders remain unpaid or partially paid.
      if (definition.status === "READY" && definition.index % 3 !== 0) {
        continue;
      }

      const paymentTotal =
        definition.status === "COMPLETED"
          ? orderTotal
          : Math.floor((orderTotal * 65) / 100);

      // Some orders are paid using two different methods.
      const shouldSplitPayment = definition.index % 4 === 0;

      const paymentAmounts = shouldSplitPayment
        ? [
            Math.floor((paymentTotal * 60) / 100),
            paymentTotal - Math.floor((paymentTotal * 60) / 100),
          ]
        : [paymentTotal];

      for (const [paymentIndex, paymentAmount] of paymentAmounts.entries()) {
        const paymentNumber = paymentsToCreate.length;

        // Distribute payment dates and methods.
        const method =
          PAYMENT_METHODS[
            (definition.index + paymentIndex) % PAYMENT_METHODS.length
          ];

        // Refund some payments partially or completely.
        let refundAmount: string | null = null;

        if (paymentNumber % 11 === 0) {
          refundAmount = formatMoney(paymentAmount);
        } else if (paymentNumber % 7 === 0) {
          refundAmount = formatMoney(Math.floor((paymentAmount * 25) / 100));
        }

        paymentsToCreate.push({
          orderId: order.id,
          method,
          amount: formatMoney(paymentAmount),
          createdAt: getTransactionTimestamp(
            getOrderDateKey(order.order_date),
            22,
            (paymentNumber * 7) % 60,
          ),
          refundAmount,
        });
      }
    }

    // Create payments and their associated refunds.
    let paymentsCreated = 0;
    let refundsCreated = 0;

    for (const paymentDefinition of paymentsToCreate) {
      const payment = await trx
        .insertInto("payments")
        .values({
          restaurant_id: restaurantId,
          order_id: paymentDefinition.orderId,
          method: paymentDefinition.method,
          amount: paymentDefinition.amount,
          created_by: adminId,
          created_at: paymentDefinition.createdAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      paymentsCreated++;

      if (!paymentDefinition.refundAmount) {
        continue;
      }

      await trx
        .insertInto("refunds")
        .values({
          restaurant_id: restaurantId,
          payment_id: payment.id,
          amount: paymentDefinition.refundAmount,
          created_by: adminId,
          created_at: getTransactionTimestamp(
            getOrderDateKey(
              paymentDefinition.createdAt.toISOString().slice(0, 10),
            ),
            23,
            (refundsCreated * 11) % 60,
          ),
        })
        .execute();

      refundsCreated++;
    }

    console.log(
      `Demo seed created ${menuItems.length} menu items, ${orders.length} orders, ${paymentsCreated} payments and ${refundsCreated} refunds.`,
    );
  });
};

try {
  await seedDemo();
  console.log("Demo seed completed successfully.");
} catch (error) {
  console.error("Demo seed failed:", error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
