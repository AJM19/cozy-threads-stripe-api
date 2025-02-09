import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://cozy-threads-app.onrender.com",
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  next();
});

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/cozy-threads/customers", async (req: Request, res: Response) => {
  const customers = await stripe.customers.list();

  res.send(customers.data);
});

app.get(
  "/cozy-threads/products",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await stripe.products.list({
        expand: ["data.default_price"],
      });

      res.send(products.data);
    } catch (e) {
      next(e);
    }
  },
);

app.post(
  "/cozy-threads/create-payment-intent",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { total } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "usd",
      });

      res.json({
        client_secret: paymentIntent.client_secret,
        amount: total / 100,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
