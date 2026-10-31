-- Base de datos de Chaski (Cloudflare D1): los eventos de las partidas.
-- Se ejecuta una sola vez al crear la base. Ver docs/despliegue.md.

CREATE TABLE IF NOT EXISTS events (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  eid   TEXT    NOT NULL UNIQUE,  -- sid|ts|tipo|k o ex: evita guardar dos veces el mismo evento
  ts    INTEGER NOT NULL,         -- hora del evento, en milisegundos
  cls   TEXT    NOT NULL,         -- código de clase, en mayúsculas
  alias TEXT    NOT NULL,         -- apodo del estudiante (nunca su nombre)
  topic TEXT    NOT NULL,         -- proporciones, porcentajes o ecuaciones
  sid   TEXT    NOT NULL,         -- identificador de la partida
  type  TEXT    NOT NULL,         -- start, teach, brain, ex o probe
  data  TEXT    NOT NULL          -- el evento completo, en JSON
);

CREATE INDEX IF NOT EXISTS events_by_class ON events (cls, topic, ts);
