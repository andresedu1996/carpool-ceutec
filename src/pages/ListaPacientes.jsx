import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, getDoc, doc } from "firebase/firestore";
import { FaUserCheck, FaHistory } from "react-icons/fa";

function ListaPacientes({ setActiveTab }) {
  const [citas, setCitas] = useState([]);
  const [pacientesMap, setPacientesMap] = useState(new Map());
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    const qCitas = query(collection(db, "citas"), where("estado", "==", "en_espera"));
    const unsubCitas = onSnapshot(qCitas, async (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCitas(rows);

      const pacientesSet = new Set(rows.map((c) => c.pacienteId || c.pacienteExpediente));
      const map = new Map(pacientesMap);
      for (const id of pacientesSet) {
        if (!map.has(id)) {
          try {
            const ref = doc(db, "pacientes", id);
            const snapPac = await getDoc(ref);
            if (snapPac.exists()) {
              map.set(id, snapPac.data());
            }
          } catch (err) {
            console.error("Error cargando paciente", id, err);
          }
        }
      }
      setPacientesMap(map);
    });

    return () => unsubCitas();
  }, []);

  const prioridadPeso = { alta: 0, media: 1, baja: 2 };

  const obtenerColorPrioridad = (prioridad) => {
    switch (prioridad) {
      case "alta":
        return { bg: "danger", text: "white" };
      case "media":
        return { bg: "warning", text: "black" };
      case "baja":
        return { bg: "primary", text: "white" };
      default:
        return { bg: "secondary", text: "white" };
    }
  };

  const listaOrdenada = useMemo(() => {
    const fusion = citas.map((cita) => {
      let fecha = "—";
      let hora = "";

      if (cita.fecha && cita.horario) {
        const fechaObj = new Date(cita.fecha);
        fecha = fechaObj.toLocaleDateString();
        hora = cita.horario;
      } else if (cita.fechaHora) {
        const fechaObj = new Date(cita.fechaHora);
        fecha = fechaObj.toLocaleDateString();
        hora = fechaObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      const pacienteData = pacientesMap.get(cita.pacienteId || cita.pacienteExpediente) || {};

      return {
        id: cita.id,
        expediente: cita.pacienteExpediente || cita.pacienteId,
        nombre: cita.pacienteNombre || pacienteData.nombre || "—",
        edad: pacienteData.edad ?? "—",
        prioridad: (cita.prioridad || "media").toLowerCase(),
        fecha,
        hora,
        doctor: cita.doctorNombre || "—",
      };
    });

    // filtro búsqueda + prioridad
    const filtrados = fusion.filter((c) => {
      const coincidePrioridad = filtro === "todas" || c.prioridad === filtro;
      if (!coincidePrioridad) return false;
      if (!busqueda.trim()) return true;
      const cadena = `${c.nombre} ${c.expediente} ${c.doctor}`.toLowerCase();
      return cadena.includes(busqueda.trim().toLowerCase());
    });

    filtrados.sort((a, b) => {
      const pa = prioridadPeso[a.prioridad] ?? 1;
      const pb = prioridadPeso[b.prioridad] ?? 1;
      if (pa !== pb) return pa - pb;

      const ta = a.fecha ? Date.parse(a.fecha) : Infinity;
      const tb = b.fecha ? Date.parse(b.fecha) : Infinity;
      if (ta !== tb) return ta - tb;

      return String(a.expediente).localeCompare(String(b.expediente));
    });

    return filtrados;
  }, [citas, pacientesMap, busqueda, filtro]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2 className="text-center mb-4">Lista de Espera</h2>

      {/* Barra búsqueda + filtro */}
      <div className="card mb-3">
        <div className="card-body d-flex gap-2 flex-wrap align-items-center">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, expediente o doctor"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select
            className="form-select"
            style={{ width: 180 }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="todas">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <span className="ms-auto text-muted small">
            Mostrando {listaOrdenada.length} de {citas.length}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <table className="table table-hover table-lg align-middle text-center">
        <thead className="table-dark">
          <tr>
            <th>Expediente</th>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Prioridad</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Doctor</th>
          </tr>
        </thead>
        <tbody>
          {listaOrdenada.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center">
                Sin citas en espera 🙌
              </td>
            </tr>
          ) : (
            listaOrdenada.map((cita) => {
              const infoColor = obtenerColorPrioridad(cita.prioridad);
              return (
                <tr key={cita.id} className={`table-${infoColor.bg}`}>
                  <td>{cita.expediente}</td>
                  <td>{cita.nombre}</td>
                  <td>{cita.edad}</td>
                  <td>
                    <span className={`badge bg-${infoColor.bg} text-${infoColor.text}`}>
                      {cita.prioridad.toUpperCase()}
                    </span>
                  </td>
                  <td>{cita.fecha}</td>
                  <td>{cita.hora}</td>
                  <td>{cita.doctor}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Botones de navegación */}
      <div className="d-flex justify-content-center gap-3 mt-4">
        <button
          className="btn btn-info px-4 d-flex align-items-center gap-2"
          onClick={() => setActiveTab("atender")}
        >
          <FaUserCheck />
          Atender Pacientes
        </button>
        <button
          className="btn btn-success px-4 d-flex align-items-center gap-2"
          onClick={() => setActiveTab("historial")}
        >
          <FaHistory />
          Ver Historial
        </button>
      </div>
    </div>
  );
}

export default ListaPacientes;
