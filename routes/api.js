const express = require('express');
const router = express.Router();

// Controlador temporal mientras se crea el real
const clienteController = {
    getClientes: async (req, res) => {
        try {
            // Datos de ejemplo
            const clientes = [
                {
                    id: 1,
                    rut: '76.543.210-K',
                    nombreEmpresa: 'Empresa Ejemplo 1',
                    email: 'contacto@empresa1.cl',
                    direccion: 'Calle Principal 123',
                    ciudad: 'Santiago',
                    estado: true
                },
                {
                    id: 2,
                    rut: '77.654.321-0',
                    nombreEmpresa: 'Empresa Ejemplo 2',
                    email: 'contacto@empresa2.cl',
                    direccion: 'Avenida Central 456',
                    ciudad: 'Valparaíso',
                    estado: true
                }
            ];
            
            res.json({
                success: true,
                clientes: clientes
            });
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista de clientes'
            });
        }
    },
    
    getClienteById: async (req, res) => {
        try {
            const cliente = {
                id: req.params.id,
                rut: '76.543.210-K',
                nombreEmpresa: 'Empresa Ejemplo',
                email: 'contacto@empresa.cl',
                telefono: '+56912345678',
                contactoPrincipal: 'Juan Pérez',
                direccion: 'Calle Principal 123',
                comuna: 'Santiago',
                ciudad: 'Santiago',
                region: 'Metropolitana',
                estado: true
            };
            
            res.json({
                success: true,
                cliente: cliente
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener los datos del cliente'
            });
        }
    },
    
    createCliente: async (req, res) => {
        try {
            res.status(201).json({
                success: true,
                cliente: req.body,
                message: 'Cliente creado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al crear el cliente'
            });
        }
    },
    
    updateCliente: async (req, res) => {
        try {
            res.json({
                success: true,
                cliente: req.body,
                message: 'Cliente actualizado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el cliente'
            });
        }
    },
    
    deleteCliente: async (req, res) => {
        try {
            res.json({
                success: true,
                message: 'Cliente eliminado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al eliminar el cliente'
            });
        }
    }
};

// Rutas para clientes
router.get('/clientes', clienteController.getClientes);
router.get('/clientes/:id', clienteController.getClienteById);
router.post('/clientes', clienteController.createCliente);
router.put('/clientes/:id', clienteController.updateCliente);
router.delete('/clientes/:id', clienteController.deleteCliente);

module.exports = router; 