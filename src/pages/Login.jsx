// src/pages/Login.jsx
import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login({ role = "pasajero" }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isConductor = role === "conductor";
  const tituloRol = isConductor ? "Conductor" : "Pasajero";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        // Crear usuario
        const res = await createUserWithEmailAndPassword(auth, email, password);

        // Guardar en Firestore: rol del usuario
        await setDoc(doc(db, "usuarios", res.user.uid), {
          email,
          role: role || "pasajero",
          createdAt: new Date().toISOString(),
        });

        alert("Cuenta creada correctamente");
      } else {
        // Iniciar sesión
        await signInWithEmailAndPassword(auth, email, password);
      }

      // Redirecciones según el rol
      if (isConductor) {
        navigate("/panel-conductor");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #22c55e30 0%, #020617 55%, #000 100%)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 24,
          margin: 16,
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.4)",
          background: "rgba(15,23,42,0.92)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.6)",
          color: "#e5e7eb",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Encabezado */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <div
            style={{
              width: 54,
              height: 54,
              margin: "0 auto 10px auto",
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #22c55e, #16a34a, #15803d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#022c22",
              fontWeight: "bold",
              fontSize: 26,
            }}
          >
            {tituloRol.charAt(0)}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: "#f9fafb",
            }}
          >
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 14, opacity: 0.8 }}>
            Modo: <strong>{tituloRol}</strong>
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
                color: "#e5e7eb",
              }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.8)",
                backgroundColor: "#020617",
                color: "#f9fafb",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
                color: "#e5e7eb",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.8)",
                backgroundColor: "#020617",
                color: "#f9fafb",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#fecaca",
                backgroundColor: "rgba(127,29,29,0.35)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 10,
              background:
                "linear-gradient(135deg, #22c55e, #16a34a, #15803d)",
              color: "#022c22",
              borderRadius: 999,
              border: "none",
              fontWeight: 600,
              marginTop: 4,
              marginBottom: 8,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            {isRegister ? "Registrarse" : "Entrar"}
          </button>
        </form>

        {/* Toggle entre login / registro */}
        <p
          style={{
            marginTop: 4,
            textAlign: "center",
            fontSize: 14,
          }}
        >
          {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <span
            style={{
              color: "#38bdf8",
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </span>
        </p>

        {/* Botón para cambiar de tipo de usuario */}
        <hr style={{ borderColor: "rgba(55,65,81,0.8)", margin: "16px 0" }} />
        <div style={{ textAlign: "center" }}>
          {!isConductor ? (
            <button
              onClick={() => navigate("/login-conductor")}
              style={{
                marginTop: 4,
                padding: 8,
                width: "100%",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 14,
              }}
              type="button"
            >
              Soy conductor
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: 4,
                padding: 8,
                width: "100%",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 14,
              }}
              type="button"
            >
              Soy pasajero
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
