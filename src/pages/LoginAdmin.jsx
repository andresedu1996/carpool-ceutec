import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FaUserShield, FaSignInAlt, FaArrowLeft } from "react-icons/fa";

function LoginAdmin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().role === "admin") {
          navigate("/panel-admin");
        }
      } catch (err) {
        console.error("No se pudo validar el rol del admin", err);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (loading) return;

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const ref = doc(db, "usuarios", cred.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().role !== "admin") {
        await signOut(auth);
        setError(
          "Tu cuenta no tiene permisos de administrador. Solicita acceso con el equipo."
        );
        return;
      }
      navigate("/panel-admin");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #38bdf820 0%, #020617 55%, #000 100%)",
        padding: 16,
      }}
    >
      <div
        className="card shadow-lg"
        style={{
          maxWidth: 420,
          width: "100%",
          backgroundColor: "rgba(15,23,42,0.95)",
          color: "#f8fafc",
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.4)",
        }}
      >
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button
              type="button"
              className="btn btn-link text-secondary p-0"
              onClick={() => navigate("/")}
              style={{ textDecoration: "none" }}
            >
              <FaArrowLeft className="me-1" />
              Inicio
            </button>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Acceso restringido
            </span>
          </div>

          <div className="text-center mb-3">
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "999px",
                margin: "0 auto 12px",
                background:
                  "linear-gradient(135deg,#38bdf8,#0ea5e9,#0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
              }}
            >
              <FaUserShield size={28} />
            </div>
            <h3 style={{ marginBottom: 4, fontSize: "1.35rem" }}>
              Panel Administrador
            </h3>
            <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 0 }}>
              Los usuarios administradores se crean manualmente desde Firebase.
              Si necesitas acceso, coordina con el equipo.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Correo institucional</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ceutec.edu"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2" style={{ fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                "Validando..."
              ) : (
                <>
                  <FaSignInAlt className="me-2" />
                  Entrar como Admin
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginAdmin;
