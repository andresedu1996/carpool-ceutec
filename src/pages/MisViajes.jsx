import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function MisViajes() {
  const [user, setUser] = useState(null);
  const [viajes, setViajes] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoadingUser(false);
    });

    return () => unsubAuth();
  }, []);

  // Cargar viajes del usuario logueado
  useEffect(() => {
    if (!user) {
      setViajes([]);
      setLoadingViajes(false);
      return;
    }

    setLoadingViajes(true);
    setMensaje("");

    // Buscamos viajes por email de pasajero
    const q = query(
      collection(db, "viajes"),
      where("pasajeroEmail", "==", user.email),
      orderBy("fecha", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setViajes(rows);
        setLoadingViajes(false);
      },
      (err) => {
        console.error("Error cargando viajes:", err);
        setMensaje("No se pudieron cargar tus viajes.");
        setLoadingViajes(false);
      }
    );

    return () => unsub();
  }, [user]);

  const cancelarViaje = async (viaje) => {
    if (!window.confirm("¿Seguro que deseas cancelar este viaje?")) return;

    try {
      const ref = doc(db, "viajes", viaje.id);
      await updateDoc(ref, {
        estado: "cancelado",
        canceladoAt: new Date(),
      });
      setMensaje("✅ Viaje cancelado correctamente.");
    } catch (err) {
      console.error("Error cancelando viaje:", err);
      setMensaje("❌ No se pudo cancelar el viaje.");
    }
  };

  if (loadingUser) {
    return <p>Cargando usuario...</p>;
  }

  if (!user) {
    return <p>Debes iniciar sesión para ver tus viajes.</p>;
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 className="text-center mb-3">Mi viaje programado</h2>

      {/* Info básica del usuario */}
      <div className="card mb-3">
        <div className="card-body">
          <p>
            <strong>Correo:</strong> {user.email}
          </p>
        </div>
      </div>

      {mensaje && (
        <div className="alert alert-info py-2">{mensaje}</div>
      )}

      {loadingViajes ? (
        <p>Cargando viajes...</p>
      ) : viajes.length === 0 ? (
        <p>No tienes viajes registrados.</p>
      ) : (
        <div className="list-group">
          {viajes.map((v) => (
            <div key={v.id} className="card mb-3">
              <div className="card-body">
                <p>
                  <strong>Conductor:</strong> {v.conductorNombre}
                </p>
                <p>
                  <strong>Fecha:</strong> {v.fecha}
                </p>
                <p>
                  <strong>Horario:</strong> {v.horario}
                </p>
                <p>
                  <strong>Estado:</strong>{" "}
                  <span
                    className={
                      v.estado === "programado"
                        ? "badge bg-success"
                        : "badge bg-secondary"
                    }
                  >
                    {v.estado}
                  </span>
                </p>

                {/* Si guardaste más info del conductor (colonia, precio, etc.) la puedes mostrar aquí */}
                {v.conductorColonia && (
                  <p>
                    <strong>Colonia:</strong> {v.conductorColonia}
                  </p>
                )}
                {v.precio && (
                  <p>
                    <strong>Precio:</strong> L {v.precio}
                  </p>
                )}

                <button
                  className="btn btn-outline-danger mt-2"
                  onClick={() => cancelarViaje(v)}
                  disabled={v.estado !== "programado"}
                >
                  {v.estado === "programado"
                    ? "Cancelar viaje"
                    : "Ya no se puede cancelar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MisViajes;
