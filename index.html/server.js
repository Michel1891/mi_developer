// server.js
import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🧾 Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// 🔥 Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

/* ============================
   ENDPOINT: Crear preferencia
============================ */
app.post("/create_preference", async (req, res) => {
  try {
    const { userId, email, videoId } = req.body;

    const preference = {
      items: [
        {
          title: `Acceso al video: ${videoId}`,
          quantity: 1,
          currency_id: "USD",
          unit_price: parseFloat(process.env.PRICE_USD || "5.00"),
        },
      ],
      payer: { email },
      back_urls: {
        success: process.env.BACK_URL_SUCCESS,
        failure: process.env.BACK_URL_FAILURE,
      },
      auto_return: "approved",
      metadata: { userId, videoId },
    };

    const mpRes = await mercadopago.preferences.create(preference);
    res.json({ id: mpRes.body.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo crear preferencia" });
  }
});

/* ====================================
   ENDPOINT: Webhook de Mercado Pago
==================================== */
app.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment" && data && data.id) {
      const paymentInfo = await mercadopago.payment
        .findById(data.id)
        .then((r) => r.body)
        .catch(() => null);

      if (
        paymentInfo &&
        (paymentInfo.status === "approved" || paymentInfo.status === "paid")
      ) {
        const { userId, videoId } = paymentInfo.metadata || {};

        if (userId && videoId) {
          // Guardar en Firestore que el usuario tiene acceso
          const docRef = db.collection("pagos").doc(`${userId}_${videoId}`);
          await docRef.set(
            {
              acceso: true,
              pagoAprobado: true,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
              detallePago: {
                id: paymentInfo.id,
                status: paymentInfo.status,
                monto: paymentInfo.transaction_amount,
              },
            },
            { merge: true }
          );

          console.log(`✅ Acceso concedido a ${userId} para ${videoId}`);
        }
      }
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Error webhook:", err);
    res.status(500).send("error");
  }
});

/* ====================================
   ENDPOINT: Verificar acceso
   (opcional para frontend)
==================================== */
app.get("/check_access", async (req, res) => {
  try {
    const { userId, videoId } = req.query;
    if (!userId || !videoId)
      return res.status(400).json({ error: "faltan parámetros" });

      await setDoc(doc(db, "pagos", `${userId}_${videoId}`), {
        acceso: true,
        fecha: new Date().toISOString()
      });

    if (doc.exists && doc.data().acceso === true) {
      res.json({ acceso: true });
    } else {
      res.json({ acceso: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error verificando acceso" });
  }
});

/* ====================================
   Inicializar servidor
==================================== */
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`🚀 Server en puerto ${PORT}`));

