import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
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
      const productIds: string[] = req.body.products;

      if (!productIds || productIds.length === 0) {
        res.status(400).json({ error: "No products provided" });
      }

      const prices = await Promise.all(
        productIds.map(async (productId) => {
          const product = await stripe.products.retrieve(productId);

          if (!product.default_price) {
            throw new Error(`No Price set`);
          }

          const price = await stripe.prices.retrieve(
            product.default_price as string,
          );

          if (price.unit_amount === null) {
            throw new Error(`Price not set`);
          }

          return price.unit_amount;
        }),
      );

      const totalAmount = prices.reduce((sum, price) => sum + price, 0);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
      });

      res.json({
        client_secret: paymentIntent.client_secret,
        amount: totalAmount / 100,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
