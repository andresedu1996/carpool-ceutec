import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

function ModificarExpediente() {
  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  //Cargar los px
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

  const limpiarBusqueda = () => {
    setBusqueda("");
    setPaciente(null);
    setCitas([]);
    setSugerencias([]);
    setError("");
  };

  // Filtrar px
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
    setSugerencias(filtrados.slice(0, 8));
  };

  // Seleccionar px lista
  const seleccionarPaciente = async (p) => {
    setPaciente(p);
    setBusqueda(`${p.expediente} - ${p.nombre}`);
    setSugerencias([]);
    setLoading(true);
    setError("");

    try {
      const qCitas = query(
        collection(db, "citas"),
        where("estado", "==", "en_espera"),
        where("pacienteId", "==", p.id)
      );
      const snapCitas = await getDocs(qCitas);
      const citasData = snapCitas.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCitas(citasData);
    } catch (err) {
      console.error(err);
      setError("Error buscando citas del paciente.");
    } finally {
      setLoading(false);
    }
  };

  const guardarCambiosCita = async (citaId, cambios) => {
    const citaOriginal = citas.find((c) => c.id === citaId);
    const prioridadAnterior = citaOriginal.prioridad;
    const prioridadNueva = cambios.prioridad;

    if (prioridadNueva && prioridadAnterior !== prioridadNueva) {
      const confirmacion = window.confirm(
        `¿Está a punto de cambiar prioridad de ${prioridadAnterior.toUpperCase()} a ${prioridadNueva.toUpperCase()}?\n\n¿Desea continuar?`
      );
      if (!confirmacion) return;
    }

    try {
      const citaRef = doc(db, "citas", citaId);
      const updates = {
        ...cambios,
        updatedAt: serverTimestamp(),
      };

      if (cambios.atendido) {
        updates.estado = "atendida";
        updates.atendidoAt = serverTimestamp();
      }

      await updateDoc(citaRef, updates);

      setCitas((prev) =>
        prev.map((c) => (c.id === citaId ? { ...c, ...updates } : c))
      );

      if (prioridadNueva && prioridadAnterior !== prioridadNueva) {
        alert(
          `Prioridad actualizada correctamente!\n\n` +
            `Cambio de prioridad: ${prioridadAnterior.toUpperCase()} → ${prioridadNueva.toUpperCase()}`
        );
      } else {
        alert("Cita actualizada correctamente");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar cita. Revisa la consola");
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 className="text-center mb-3">Modificar Citas / Cambiar Prioridades</h2>

      {/*autofill*/}
      <div className="mb-3 position-relative">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar expediente o nombre..."
          value={busqueda}
          onChange={handleBusqueda}
        />
        {sugerencias.length > 0 && (
          <ul
            className="list-group position-absolute w-100"
            style={{ zIndex: 1000 }}
          >
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

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-outline-secondary" onClick={limpiarBusqueda}>
          Limpiar
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {paciente && (
        <div className="card mb-3">
          <div className="card-body">
            <p>
              <strong>Expediente:</strong> {paciente.expediente}
            </p>
            <p>
              <strong>Nombre:</strong> {paciente.nombre}
            </p>
            {paciente.fechaNacimiento && (
              <p>
                <strong>Fecha Nac.:</strong> {paciente.fechaNacimiento}</p>
            )}
          </div>
        </div>
      )}

      <div className="alert alert-info">
        <h6>Cambio de Prioridades:</h6>
        <small>
          <strong>ALTA:</strong> Se atiende primero (casos urgentes)<br />
          <strong>MEDIA:</strong> Después de prioridad alta<br />
          <strong>BAJA:</strong> Se atiende al final
        </small>
      </div>

      {citas.length > 0 ? (
        citas.map((cita) => (
          <CitaForm
            key={cita.id}
            cita={cita}
            onGuardar={guardarCambiosCita}
          />
        ))
      ) : paciente ? (
        <div className="alert alert-info">
          No hay citas en espera para este paciente
        </div>
      ) : null}
    </div>
  );
}

function CitaForm({ cita, onGuardar }) {
  const [sintomas, setSintomas] = useState(cita.sintomas || "");
  const [motivo, setMotivo] = useState(cita.motivo || "");
  const [prioridad, setPrioridad] = useState(cita.prioridad || "media");
  const [atendido, setAtendido] = useState(false);
  const [saving, setSaving] = useState(false);

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case "alta":
        return "danger";
      case "media":
        return "warning";
      case "baja":
        return "primary";
      default:
        return "secondary";
    }
  };

  const prioridadCambio = prioridad !== cita.prioridad;
  const handleGuardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onGuardar(cita.id, { sintomas, motivo, prioridad, atendido });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleGuardar}
      className={`border rounded p-3 mb-3 bg-dark bg-opacity-50 ${
        prioridadCambio ? "border-warning border-3" : ""
      }`}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Cita en Espera</h5>
        <span
          className={`badge bg-${getPrioridadColor(
            cita.prioridad
          )} px-3 py-2`}
        >
          PRIORIDAD ACTUAL: {cita.prioridad.toUpperCase()}
        </span>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <strong>Doctor:</strong> {cita.doctorNombre}
        </div>
        <div className="col-md-6">
          <strong>Área:</strong> {cita.area}
        </div>
        <div className="col-md-6">
          <strong>Fecha:</strong> {cita.fecha}
        </div>
        <div className="col-md-6">
          <strong>Horario:</strong> {cita.horario}
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label">Síntomas</label>
          <input
            className="form-control"
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Motivo</label>
          <input
            className="form-control"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-8">
          <label className="form-label">
            Prioridad
            {prioridadCambio && (
              <span className="text-warning ms-2">
                (Cambio: {cita.prioridad.toUpperCase()} →{" "}
                {prioridad.toUpperCase()})
              </span>
            )}
          </label>
          <select
            className={`form-select ${
              prioridadCambio ? "border-warning border-2" : ""
            }`}
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            disabled={saving}
          >
            <option value="alta">ALTA - Urgente</option>
            <option value="media">MEDIA - Normal</option>
            <option value="baja">BAJA - No urgente</option>
          </select>
        </div>
      </div>

      <button
        className={`btn w-100 ${
          prioridadCambio ? "btn-warning" : "btn-success"
        }`}
        type="submit"
        disabled={saving}
      >
        {saving
          ? "Guardando información..."
          : prioridadCambio
          ? "GUARDAR Y CAMBIAR PRIORIDAD"
          : "Guardar Cambios"}
      </button>
    </form>
  );
}
export default ModificarExpediente;
