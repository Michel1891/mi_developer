import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = "TU_ACCESS_TOKEN_DE_MERCADOPAGO"; // ⚠️ reemplaza con tu token real

// Verifica si el usuario tiene suscripción activa
app.get("/check_subscription", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    const r = await fetch("https://api.mercadopago.com/preapproval_plan/search", {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });
    const data = await r.json();

    // 🔍 Aquí podrías buscar por e-mail o guardar la relación email → preapproval_id en Firestore
    const active = true; // simulamos que está activo
    res.json({ active });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar suscripción" });
  }
});

app.listen(5500, () => console.log("Servidor backend en http://localhost:5500"));
