CREATE TABLE IF NOT EXISTS visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_visita VARCHAR(50),
    cliente_id INT,
    empleado_id INT,
    tipo_visita ENUM('evaluacion','recoleccion','seguimiento','inspeccion'),
    fecha_visita DATE,
    hora_visita TIME,
    duracion_estimada INT,
    estado ENUM('pendiente','confirmada','en_proceso','completada','cancelada'),
    direccion_visita TEXT,
    observaciones TEXT,
    notas_tecnico TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por INT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id)
); 