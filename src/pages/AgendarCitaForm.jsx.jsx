import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
  where,
  onSnapshot,
} from "firebase/firestore";

function AgendarCitaForm() {
  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState([]); // todos los pacientes cargados
  const [sugerencias, setSugerencias] = useState([]); // resultados filtrados
  const [paciente, setPaciente] = useState(null);

  const [doctores, setDoctores] = useState([]);
  const [citas, setCitas] = useState([]);

  const [form, setForm] = useState({
    area: "",
    doctorId: "",
    fecha: "",
    horario: "",
    sintomas: "",
    motivo: "",
    prioridad: "media",
  });

  const [agendando, setAgendando] = useState(false);

  // Cargar todos los px
  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        const snap = await getDocs(collection(db, "pacientes"));
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPacientes(rows);
      } catch (err) {
        console.error("Error cargando pacientes", err);
      }
    };
    cargarPacientes();
  }, []);

  // Load de doc
  useEffect(() => {
    const cargarDoctores = async () => {
      try {
        const snap = await getDocs(query(collection(db, "doctores")));
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        rows.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
        setDoctores(rows);
      } catch (err) {
        console.error(err);
        alert("No se pudieron cargar los doctores.");
      }
    };
    cargarDoctores();
  }, []);

  // conxultas de citas
  useEffect(() => {
    const qCitas = query(collection(db, "citas"), where("estado", "==", "en_espera"));
    const unsub = onSnapshot(qCitas, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCitas(rows);
    });
    return () => unsub();
  }, []);

  const areas = useMemo(() => {
    const s = new Set(doctores.map((d) => (d.area || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [doctores]);

  const doctoresFiltrados = useMemo(() => {
    if (!form.area) return [];
    return doctores.filter((d) => (d.area || "").trim() === form.area);
  }, [doctores, form.area]);

  // muestra los horarios disponibles del doctor
  const horariosDisponiblesDelDoctor = useMemo(() => {
    if (!form.doctorId || !form.fecha) return [];
    const selDoctor = doctores.find((d) => d.id === form.doctorId);
    if (!selDoctor) return [];

    const horariosOcupados = citas
      .filter((c) => c.doctorId === form.doctorId && c.fecha === form.fecha)
      .map((c) => c.horario);

    return (selDoctor.horarios || []).filter((h) => !horariosOcupados.includes(h));
  }, [form.doctorId, form.fecha, doctores, citas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "area") {
      setForm((f) => ({ ...f, area: value, doctorId: "", horario: "" }));
      return;
    }
    if (name === "doctorId") {
      setForm((f) => ({ ...f, doctorId: value, horario: "" }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  // filtro de px mientras escribe
  const handleBusqueda = (e) => {
    const value = e.target.value;
    setBusqueda(value);
    if (!value.trim()) {
      setSugerencias([]);
      return;
    }
    const lower = value.toLowerCase();
    const filtrados = pacientes.filter(
      (p) =>
        String(p.expediente || "").toLowerCase().includes(lower) ||
        String(p.nombre || "").toLowerCase().includes(lower)
    );
    setSugerencias(filtrados.slice(0, 8)); // máximo 8 sugerencias
  };

  // select de px de lista
  const seleccionarPaciente = (p) => {
    setPaciente(p);
    setBusqueda(`${p.expediente} - ${p.nombre}`);
    setSugerencias([]);
  };

  // agegndar
  const agendarCita = async (e) => {
    e.preventDefault();
    if (!paciente) return alert("Primero seleccione un paciente");
    if (!form.area || !form.doctorId || !form.fecha || !form.horario)
      return alert("Completa todos los campos requeridos");

    setAgendando(true);
    try {
      const selDoctor = doctores.find((d) => d.id === form.doctorId);

      const citaRef = doc(collection(db, "citas"));
      await setDoc(citaRef, {
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre,
        pacienteEdad: paciente.edad,
        area: form.area,
        doctorId: selDoctor.id,
        doctorNombre: selDoctor.nombre,
        fecha: form.fecha,
        horario: form.horario,
        sintomas: form.sintomas,
        motivo: form.motivo,
        prioridad: form.prioridad,
        estado: "en_espera",
        createdAt: serverTimestamp(),
      });

      const pacRef = doc(db, "pacientes", paciente.id);
      await updateDoc(pacRef, {
        enEspera: true,
        ultimaCitaId: citaRef.id,
        ultimaCitaFecha: form.fecha,
      });

      alert("✅ Cita agendada y paciente enviado a lista de espera");

      setForm({
        area: "",
        doctorId: "",
        fecha: "",
        horario: "",
        sintomas: "",
        motivo: "",
        prioridad: "media",
      });
      setPaciente(null);
      setBusqueda("");
    } catch (err) {
      console.error(err);
      alert("Error al agendar cita");
    } finally {
      setAgendando(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 className="text-center mb-3">Agendar Cita</h2>

      {/* busq con autofill exp o nombre */}
      <div className="mb-3 position-relative">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar expediente o nombre..."
          value={busqueda}
          onChange={handleBusqueda}
        />
        {sugerencias.length > 0 && (
          <ul className="list-group position-absolute w-100" style={{ zIndex: 1000 }}>
            {sugerencias.map((p) => (
              <li
                key={p.id}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => seleccionarPaciente(p)}
              >
                {p.expediente} — {p.nombre} ({p.edad || "Edad N/D"})
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info px */}
      {paciente && (
        <div className="card mb-3">
          <div className="card-body">
            <p><strong>Expediente:</strong> {paciente.expediente}</p>
            <p><strong>Nombre:</strong> {paciente.nombre}</p>
            {paciente.edad && <p><strong>Edad:</strong> {paciente.edad}</p>}
          </div>
        </div>
      )}

      {/* form */}
      <form onSubmit={agendarCita}>
        <fieldset disabled={!paciente}>
          <label className="form-label">Área</label>
          <select name="area" className="form-control mb-2" value={form.area} onChange={handleChange}>
            <option value="">Seleccione área</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <label className="form-label">Doctor</label>
          <select
            name="doctorId"
            className="form-control mb-2"
            value={form.doctorId}
            onChange={handleChange}
            disabled={!form.area}
          >
            <option value="">Seleccione doctor</option>
            {doctoresFiltrados.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>

          <label className="form-label">Fecha</label>
          <input
            type="date"
            name="fecha"
            className="form-control mb-2"
            value={form.fecha}
            onChange={handleChange}
            disabled={!form.doctorId}
          />

          <label className="form-label">Horario disponible</label>
          <select
            name="horario"
            className="form-control mb-2"
            value={form.horario}
            onChange={handleChange}
            disabled={!form.fecha}
          >
            <option value="">Seleccione horario</option>
            {horariosDisponiblesDelDoctor.map((h, i) => (
              <option key={i} value={h}>{h}</option>
            ))}
          </select>

          <label className="form-label">Síntomas</label>
          <textarea
            name="sintomas"
            className="form-control mb-2"
            rows={2}
            value={form.sintomas}
            onChange={handleChange}
          />

          <label className="form-label">Motivo</label>
          <textarea
            name="motivo"
            className="form-control mb-2"
            rows={2}
            value={form.motivo}
            onChange={handleChange}
          />

          <label className="form-label">Prioridad</label>
          <select
            name="prioridad"
            className="form-control mb-3"
            value={form.prioridad}
            onChange={handleChange}
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>

          <button type="submit" className="btn btn-primary w-100" disabled={agendando}>
            {agendando ? "Agendando…" : "Agendar Cita"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export default AgendarCitaForm;
