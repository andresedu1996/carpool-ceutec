import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

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

  // Escuchar usuario logueado y cargar sus datos si ya existen
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
          // Si no hay doc, dejamos el form vacío (salvo que quieras poner defaults)
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
          // Campos que ya existen (email/role) se mantienen porque usamos merge
          nombre: datos.nombre,
          campus: datos.campus,
          telefono: datos.telefono,
          direccion: datos.direccion,
          updatedAt: serverTimestamp(),
        },
        { merge: true } // 👈 así no borras email, role, etc.
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
    return <p>Cargando información del usuario...</p>;
  }

  if (!user) {
    return <p>Debes iniciar sesión para registrar tus datos personales.</p>;
  }

  return (
    <form
      onSubmit={guardarDatos}
      style={{ textAlign: "left", maxWidth: 400, margin: "0 auto" }}
    >
      <h2 className="text-center mb-3">Datos Personales</h2>

      {/* Email mostrado solo como referencia */}
      <div className="mb-2">
        <label className="form-label">Correo</label>
        <input
          type="email"
          className="form-control"
          value={user.email || ""}
          disabled
        />
      </div>

      <input
        type="text"
        name="nombre"
        placeholder="Nombre completo"
        className="form-control mb-2"
        value={datos.nombre}
        onChange={handleChange}
        required
      />

      <input
        type="text"
        name="campus"
        placeholder="Campus"
        className="form-control mb-2"
        value={datos.campus}
        onChange={handleChange}
        required
      />

      <input
        type="tel"
        name="telefono"
        placeholder="Número de teléfono"
        className="form-control mb-2"
        value={datos.telefono}
        onChange={handleChange}
        required
      />

      <textarea
        name="direccion"
        placeholder="Dirección"
        className="form-control mb-3"
        rows={3}
        value={datos.direccion}
        onChange={handleChange}
        required
      />

      {mensaje && (
        <div className="alert alert-info py-2">
          {mensaje}
        </div>
      )}

      <button type="submit" className="btn btn-primary w-100" disabled={guardando}>
        {guardando ? "Guardando..." : "Guardar Datos"}
      </button>
    </form>
  );
}

export default PacienteForm;
