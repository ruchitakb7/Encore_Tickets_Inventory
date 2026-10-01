
# Stack Chosen
- Node.js – Used as the backend runtime to build the API.
- Express.js – Used to create REST APIs and handle routes, requests, and responses.
- TypeScript – Used for type safety and better maintainability.
- PostgreSQL – Used as the relational database because the ticket inventory requires transactions and reliable concurrency handling.
- Drizzle ORM – Used to define the database schema and interact with PostgreSQL using TypeScript.
- node-cron – Used to automatically expire ticket holds after their 10-minute expiry time.

# Shema 
┌─────────────────────┐       ┌─────────────────────────┐
│       EVENTS        │       │          TIERS          │
├─────────────────────┤       ├─────────────────────────┤
│ PK id               │──────<│ PK id                   │
│ title               │       │ FK event_id             │
│ venue               │       │ name                    │
│ starts_at           │       │ price                   │
└─────────────────────┘       │ currency                │
                              │ total_inventory         │
                              └───────────┬─────────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           │                             │
                           ▼                             ▼
                  ┌─────────────────┐          ┌─────────────────┐
                  │      HOLDS      │          │     ORDERS      │
                  ├─────────────────┤          ├─────────────────┤
                  │ PK id           │          │ PK id           │
                  │ FK tier_id      │          │ FK tier_id      │
                  │ quantity        │          │ quantity        │
                  │ expires_at      │          │ status          │
                  │ status          │          └─────────────────┘
                  └─────────────────┘

                  ┌─────────────────────────┐
                  │     WEBHOOK_EVENTS      │
                  ├─────────────────────────┤
                  │ PK id                   │
                  │ event_type              │
                  │ payload                 │
                  │ processed_at            │
                  └─────────────────────────┘
    
## How to Run Locally

Make sure the following are installed on your system:

- Node.js
- npm
- PostgreSQL

### Setup

Clone the repository:

```bash
git clone https://github.com/ruchitakb7/Encore_Tickets_Inventory.git
cd Encore_Tickets_Inventory

Create a `.env` file in the project root and add the following:

```env
DATABASE_URL=your_postgresql_connection_string
BACKEND_URL=http://localhost:5000

npm run db:generate
npm run db:migrate

# how to send test webhooks?  

# use postman to check api

# order.paid
First create a hold and copy its hold_id.
When testing the `order.paid` webhook, make sure to use the correct values for the hold and tier that you are trying to convert into a paid order

POST https://encore-tickets-inventory.onrender.com/webhooks/payments

payload {
  "event_id": "webhook_002",
  "type": "order.paid",
  "order_id": "ord_501",
  "hold_id": "will get it after adding ticket in cart",
  "tier_id": "tier_001_b",
  "quantity": 2,
  "amount_total": 17000,
  "currency": "EUR",
  "occurred_at": "2026-09-30T14:10:00Z"
}  

event_id must be unique for every webhook event.
order_id should be unique for a new payment/order.
hold_id must be the ID of an existing active hold created through the hold API.
tier_id must match the tier associated with that hold.

For each new payment test, create a new hold first and use its hold_id. Also use a new event_id and order_id.
If the same webhook payload is sent again with the same event_id, it will not process the payment again. The API will return an idempotency respons

### `order.refunded` Webhook

After an `order.paid` webhook has been successfully processed, you can test the refund webhook using the same `order_id` that was created by the paid webhook.

```http
POST https://encore-tickets-inventory.onrender.com/webhooks/payments
Content-Type: application/json

payload 
{
  "event_id": "webhook_refund_001",
  "type": "order.refunded",
  "order_id": "ord_501",
  "amount_refunded": 17000,
  "currency": "EUR",
  "occurred_at": "2026-09-30T14:20:00Z"
}

event_id must be unique for every webhook event.
order_id must match an existing paid order.

The order status changes from paid to refunded.
The quantity associated with the refunded order is released back into the ticket inventory.
The released tickets become available for new holds.

### Refund Webhook Before Order Exists

The system also handles the case where an `order.refunded` webhook is received before the corresponding `order.paid` webhook.

For example, send a refund webhook with an `order_id` that does not exist in the database:

```http
POST https://encore-tickets-inventory.onrender.com/webhooks/payments
Content-Type: application/json

payload 
{
  "event_id": "webhook_refund_002",
  "type": "order.refunded",
  "order_id": "ord_not_created",
  "amount_refunded": 17000,
  "currency": "EUR",
  "occurred_at": "2026-09-30T14:30:00Z"
}

event_id must be unique for every webhook event.
order_id must match an existing paid order.


In this case, the order does not exist yet because the order.paid webhook has not been processed.
The webhook is not stored as processed in this case.
