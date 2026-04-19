import express from "express";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

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
