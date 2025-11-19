import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaUser, FaUniversity, FaPhone, FaMapMarkerAlt, FaCheckCircle } from "react-icons/fa";

function PacienteForm() {
  const [user, setUser] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [datos, setDatos] = useState({
    nombre: "",
    campus: "",
    telefono: "",
    direccion: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCargandoUsuario(true);
      setMensaje("");

      if (!u) {
        setUser(null);
        setCargandoUsuario(false);
        return;
      }

      setUser(u);

      try {
        const ref = doc(db, "usuarios", u.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setDatos({
            nombre: data.nombre || "",
            campus: data.campus || "",
            telefono: data.telefono || "",
            direccion: data.direccion || "",
          });
        } else {
          setDatos({
            nombre: "",
            campus: "",
            telefono: "",
            direccion: "",
          });
        }
      } catch (err) {
        console.error("Error cargando datos personales:", err);
        setMensaje("No se pudieron cargar tus datos. Intenta más tarde.");
      } finally {
        setCargandoUsuario(false);
      }
    });

    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({ ...prev, [name]: value }));
  };

  const guardarDatos = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Debes iniciar sesión para registrar tus datos personales.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const ref = doc(db, "usuarios", user.uid);

      await setDoc(
        ref,
        {
          nombre: datos.nombre,
          campus: datos.campus,
          telefono: datos.telefono,
          direccion: datos.direccion,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMensaje("✅ Datos personales guardados correctamente.");
    } catch (err) {
      console.error("Error guardando datos personales:", err);
      setMensaje("❌ Ocurrió un error al guardar tus datos.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoUsuario) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f9fafb",
        }}
      >
        Cargando información del usuario...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f9fafb",
        }}
      >
        Debes iniciar sesión para registrar tus datos personales.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0b1120",
        color: "#f8fafc",
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.4)",
        padding: 24,
        maxWidth: 500,
        margin: "0 auto",
      }}
    >
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "999px",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0b1120",
          }}
        >
          <FaUser />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Datos personales</h2>
          <small style={{ color: "rgba(226,232,240,0.7)" }}>
            Completa tu información para poder agendar viajes.
          </small>
        </div>
      </div>

      <form onSubmit={guardarDatos}>
        <div className="mb-3">
          <label className="form-label text-light">Correo</label>
          <input
            type="email"
            className="form-control bg-dark text-light"
            value={user.email || ""}
            disabled
          />
        </div>

        <div className="mb-3">
          <label className="form-label text-light">
            <FaUser className="me-1" /> Nombre completo
          </label>
          <input
            type="text"
            name="nombre"
            className="form-control bg-dark text-light"
            value={datos.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label text-light">
            <FaUniversity className="me-1" /> Campus
          </label>
          <input
            type="text"
            name="campus"
            className="form-control bg-dark text-light"
            value={datos.campus}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label text-light">
            <FaPhone className="me-1" /> Teléfono
          </label>
          <input
            type="tel"
            name="telefono"
            className="form-control bg-dark text-light"
            value={datos.telefono}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label text-light">
            <FaMapMarkerAlt className="me-1" /> Dirección
          </label>
          <textarea
            name="direccion"
            className="form-control bg-dark text-light"
            rows={3}
            value={datos.direccion}
            onChange={handleChange}
            required
          />
        </div>

        {mensaje && (
          <div
            className="alert alert-info py-2"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <FaCheckCircle className="text-success" /> {mensaje}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-success w-100"
          disabled={guardando}
          style={{ borderRadius: 12, fontWeight: 600 }}
        >
          {guardando ? "Guardando..." : "Guardar datos"}
        </button>
      </form>
    </div>
  );
}

export default PacienteForm;
