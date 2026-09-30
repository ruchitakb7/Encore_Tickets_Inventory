import "dotenv/config";

const BASE_URL = process.env.BACKEND_URL;

const url = `${BASE_URL}/events/evt_001/holds`;

const requestBody = {
  tier_id: "tier_001_c",
  quantity: 1,
};

const requestBody2 = {
  tier_id: "tier_001_c",
  quantity: 1,
};

const request1 = fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
});

const request2 = fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody2),
});

const [response1, response2] = await Promise.all([
  request1,
  request2,
]);

console.log("Request 1:", response1.status);
console.log(await response1.json());

console.log("Request 2:", response2.status);
console.log(await response2.json());