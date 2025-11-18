// ------------- Agendar Viaje con Conductor --------------

import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  doc,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function AgendarViaje() {
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);

  const [pasajero, setPasajero] = useState(null);
  const [loadingPasajero, setLoadingPasajero] = useState(true);

  const [form, setForm] = useState({
    conductorId: "",
    fecha: "",
    horario: "",
  });

  const [agendando, setAgendando] = useState(false);

  // ✅ Obtener pasajero según usuario logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPasajero(null);
        setLoadingPasajero(false);
        return;
      }

      try {
        // Buscar pasajero por email
        const qPasajero = query(
          collection(db, "pasajeros"),
          where("email", "==", user.email)
        );
        const snap = await getDocs(qPasajero);

        if (!snap.empty) {
          const d = snap.docs[0];
          setPasajero({ id: d.id, ...d.data() });
        } else {
          // Si no existe, crear uno básico
          const ref = doc(collection(db, "pasajeros"));
          const payload = {
            nombre: user.displayName || user.email,
            email: user.email,
            identidad: "",
            uid: user.uid,
            createdAt: serverTimestamp(),
          };
          await setDoc(ref, payload);
          setPasajero({ id: ref.id, ...payload });
        }
      } catch (err) {
        console.error("Error cargando pasajero del usuario:", err);
      } finally {
        setLoadingPasajero(false);
      }
    });

    return () => unsub();
  }, []);

  // Cargar conductores
  useEffect(() => {
    const loadConductores = async () => {
      const snap = await getDocs(collection(db, "conductores"));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConductores(rows);
    };
    loadConductores();
  }, []);

  // Viajes ya agendados → evitar horarios ocupados
  useEffect(() => {
    const qViajes = query(collection(db, "viajes"));
    const unsub = onSnapshot(qViajes, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setViajes(rows);
    });
    return () => unsub();
  }, []);

  // ✅ Horarios disponibles del conductor (soporta 'horario' string o 'horarios' array)
  const horariosDisponibles = useMemo(() => {
    if (!form.conductorId || !form.fecha) return [];

    const conductor = conductores.find((c) => c.id === form.conductorId);
    if (!conductor) return [];

    let posibles = [];

    // Caso 1: conductor.horarios (array)
    if (Array.isArray(conductor.horarios)) {
      posibles = conductor.horarios;
    }
    // Caso 2: conductor.horario (string simple)
    else if (
      typeof conductor.horario === "string" &&
      conductor.horario.trim() !== ""
    ) {
      posibles = [conductor.horario.trim()];
    } else {
      return [];
    }

    const ocupados = viajes
      .filter(
        (v) => v.conductorId === form.conductorId && v.fecha === form.fecha
      )
      .map((v) => v.horario);

    return posibles.filter((h) => !ocupados.includes(h));
  }, [form.conductorId, form.fecha, conductores, viajes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Agendar viaje
  const agendarViaje = async (e) => {
    e.preventDefault();

    if (!pasajero)
      return alert("No se pudo obtener el pasajero. Inicia sesión de nuevo.");
    if (!form.conductorId || !form.fecha || !form.horario)
      return alert("Complete todos los campos.");

    setAgendando(true);

    try {
      const conductor = conductores.find((c) => c.id === form.conductorId);

      const ref = doc(collection(db, "viajes"));
      await setDoc(ref, {
        pasajeroId: pasajero.id,
        pasajeroNombre: pasajero.nombre,
        pasajeroEmail: pasajero.email,
        conductorId: conductor.id,
        conductorNombre: conductor.nombre,
        fecha: form.fecha,
        horario: form.horario,
        estado: "programado",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "pasajeros", pasajero.id), {
        ultimoViajeId: ref.id,
        ultimoViajeFecha: form.fecha,
      });

      alert("🚗 Viaje agendado correctamente.");
      setForm({ conductorId: "", fecha: "", horario: "" });
    } catch (err) {
      console.error(err);
      alert("Error al agendar viaje");
    } finally {
      setAgendando(false);
    }
  };

  // ------------------- UI -------------------
  if (loadingPasajero) {
    return <p>Cargando datos del pasajero...</p>;
  }

  if (!pasajero) {
    return <p>Debe iniciar sesión para agendar un viaje.</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 className="text-center mb-3">Agendar Viaje</h2>

      {/* Info pasajero (usuario logueado) */}
      <div className="card mb-3">
        <div className="card-body">
          <p>
            <strong>Nombre:</strong> {pasajero.nombre}
          </p>
          <p>
            <strong>Email:</strong> {pasajero.email}
          </p>
          <p>
            <strong>Identidad:</strong> {pasajero.identidad || "N/D"}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={agendarViaje}>
        <label className="form-label">Conductor</label>
        <select
          name="conductorId"
          className="form-control mb-2"
          value={form.conductorId}
          onChange={handleChange}
        >
          <option value="">Seleccione conductor</option>
          {conductores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} — {c.colonia}
            </option>
          ))}
        </select>

        <label className="form-label">Fecha</label>
        <input
          type="date"
          name="fecha"
          className="form-control mb-2"
          value={form.fecha}
          onChange={handleChange}
        />

        <label className="form-label">Horario</label>
        <select
          name="horario"
          className="form-control mb-3"
          value={form.horario}
          onChange={handleChange}
          disabled={!form.fecha}
        >
          <option value="">Seleccione horario</option>
          {horariosDisponibles.map((h, i) => (
            <option key={i} value={h}>
              {h}
            </option>
          ))}
        </select>

        <button className="btn btn-primary w-100" disabled={agendando}>
          {agendando ? "Agendando…" : "Agendar Viaje"}
        </button>
      </form>
    </div>
  );
}

export default AgendarViaje;
