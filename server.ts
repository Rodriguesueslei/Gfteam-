import express from "express";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

// Mercado Pago configuration will be done lazily to use keys from database/env
let mpClient: MercadoPagoConfig | null = null;

function getMPClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Mercado Pago Access Token not configured.");
  }
  if (!mpClient) {
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Stripe Checkout
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { amount, studentId, studentName } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: `Mensalidade - ${studentName}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/?payment=success`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
        metadata: {
          studentId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mercado Pago Preference Creation
  app.post("/api/mercado-pago/create-preference", async (req, res) => {
    try {
      const { amount, studentId, studentName } = req.body;
      const client = getMPClient();
      const preference = new Preference(client);

      const response = await preference.create({
        body: {
          items: [
            {
              id: studentId,
              title: `Mensalidade - ${studentName}`,
              quantity: 1,
              unit_price: Number(amount),
              currency_id: 'BRL'
            },
          ],
          back_urls: {
            success: `${req.headers.origin}/?payment=success`,
            failure: `${req.headers.origin}/?payment=cancel`,
            pending: `${req.headers.origin}/?payment=pending`,
          },
          auto_return: 'approved',
          metadata: {
            studentId,
          }
        }
      });

      res.json({ id: response.id, init_point: response.init_point });
    } catch (error: any) {
      console.error("Mercado Pago error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Gympass Integration Endpoints (Placeholders)
  app.post("/api/gympass/validate-token", async (req, res) => {
    try {
      const { token } = req.body;
      const clientId = process.env.GYMPASS_CLIENT_ID;
      const clientSecret = process.env.GYMPASS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Gympass API credentials not configured." });
      }

      // TODO: Implement actual Wellhub (Gympass) API call here
      // 1. Get access token
      // 2. Validate student token
      
      console.log("Validating Gympass token:", token);
      
      // Mock response for now
      res.json({ 
        valid: true, 
        student: { name: "Mock Gympass User", id: "gym_123" },
        message: "Implementação da API Wellhub necessária" 
      });
    } catch (error: any) {
      console.error("Gympass error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gympass/checkin", async (req, res) => {
    try {
      const { gympassId, classId } = req.body;
      console.log(`Registering Gympass check-in for student ${gympassId} in class ${classId}`);
      
      // TODO: Notify Wellhub API about check-in
      res.json({ success: true, message: "Check-in Gympass registrado (Mock)" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gympass/validate-by-id", async (req, res) => {
    try {
      const { gympassId } = req.body;
      const clientId = process.env.GYMPASS_CLIENT_ID;
      const clientSecret = process.env.GYMPASS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Gympass API credentials not configured." });
      }

      console.log("Checking pending Gympass check-ins for studentId:", gympassId);

      // TODO: Implement actual Wellhub (Gympass) API call:
      // 1. Get access token
      // 2. Fetch "Daily List" to check if this student has a pending check-in
      // 3. If found, automatically return success/valid
      
      // Mock response for now (simulating a valid check-in found in app)
      res.json({ 
        valid: true,
        message: "Check-in pendente encontrado no App Wellhub (Mock)" 
      });
    } catch (error: any) {
      console.error("Gympass validation-by-id error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
