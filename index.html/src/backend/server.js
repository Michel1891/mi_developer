import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mercadopago from "mercadopago";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ⚙️ Configura Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// ✅ Endpoint para crear preferencia
app.post("/create_preference", async (req, res) => {
  try {
    const { title, quantity, unit_price } = req.body;

    const preference = {
      items: [
        {
          title,
          quantity,
          unit_price,
        },
      ],
      back_urls: {
        success: `${process.env.DOMAIN}/success`,
        failure: `${process.env.DOMAIN}/failure`,
        pending: `${process.env.DOMAIN}/pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.DOMAIN}/webhook`, // tu webhook
    };

    const result = await mercadopago.preferences.create(preference);

    res.json({
      id: result.body.id, // enviamos el ID de la preferencia al frontend
    });
  } catch (error) {
    console.error("❌ Error creando preferencia:", error);
    res.status(500).json({ error: "Error creando preferencia" });
  }
});

// 🔔 Webhook de Mercado Pago
app.post("/webhook", (req, res) => {
  try {
    console.log("📩 Webhook recibido:", JSON.stringify(req.body, null, 2));

    // Aquí podrías guardar la info del pago en tu base de datos (opcional)
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook:", err);
    res.sendStatus(500);
  }
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Webhook activo en: ${process.env.DOMAIN}/webhook`);
});
