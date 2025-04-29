// controllers/residuoController.js
const { Residuo, DetalleResiduo } = require('../models');
const { Op } = require('sequelize');

const residuoController = {
  // Listar residuos
  listar: async (req, res) => {
    try {
      const residuos = await Residuo.findAll({
        order: [['nombre', 'ASC']]
      });
      
      res.render('residuos/listar', {
        titulo: 'Gestión de Residuos',
        residuos,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al listar residuos:', error);
      req.flash('error', 'Error al cargar la lista de residuos');
      res.redirect('/dashboard');
    }
  },
  
  // Mostrar formulario para crear residuo
  mostrarCrear: (req, res) => {
    res.render('residuos/crear', {
      titulo: 'Nuevo Residuo',
      usuario: req.session.usuario,
      error: req.flash('error'),
      success: req.flash('success')
    });
  },
  
  // Crear residuo
  crear: async (req, res) => {
    try {
      const { nombre, descripcion, tipo, unidadMedida, precioBase } = req.body;
      
      // Validar campos
      if (!nombre || !tipo || !unidadMedida || !precioBase) {
        req.flash('error', 'Todos los campos marcados con * son obligatorios');
        return res.redirect('/residuos/crear');
      }
      
      // Crear residuo
      await Residuo.create({
        nombre,
        descripcion,
        tipo,
        unidadMedida,
        precioBase
      });
      
      req.flash('success', 'Residuo creado correctamente');
      res.redirect('/residuos');
    } catch (error) {
      console.error('Error al crear residuo:', error);
      req.flash('error', 'Error al crear residuo');
      res.redirect('/residuos/crear');
    }
  },
  
  // Mostrar formulario para editar residuo
  mostrarEditar: async (req, res) => {
    try {
      const { id } = req.params;
      
      const residuo = await Residuo.findByPk(id);
      
      if (!residuo) {
        req.flash('error', 'Residuo no encontrado');
        return res.redirect('/residuos');
      }
      
      res.render('residuos/editar', {
        titulo: 'Editar Residuo',
        residuo,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/residuos');
    }
  },
  
  // Editar residuo
  editar: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, tipo, unidadMedida, precioBase } = req.body;
      
      // Validar campos
      if (!nombre || !tipo || !unidadMedida || !precioBase) {
        req.flash('error', 'Todos los campos marcados con * son obligatorios');
        return res.redirect(`/residuos/editar/${id}`);
      }
      
      // Buscar residuo
      const residuo = await Residuo.findByPk(id);
      
      if (!residuo) {
        req.flash('error', 'Residuo no encontrado');
        return res.redirect('/residuos');
      }
      
      // Actualizar residuo
      residuo.nombre = nombre;
      residuo.descripcion = descripcion;
      residuo.tipo = tipo;
      residuo.unidadMedida = unidadMedida;
      residuo.precioBase = precioBase;
      
      await residuo.save();
      
      req.flash('success', 'Residuo actualizado correctamente');
      res.redirect('/residuos');
    } catch (error) {
      console.error('Error al editar residuo:', error);
      req.flash('error', 'Error al actualizar residuo');
      res.redirect(`/residuos/editar/${req.params.id}`);
    }
  },
  
  // Eliminar residuo
  eliminar: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si hay detalles de residuo asociados
      const detallesAsociados = await DetalleResiduo.count({ 
        where: { residuoId: id } 
      });
      
      if (detallesAsociados > 0) {
        req.flash('error', 'No se puede eliminar el residuo porque está siendo utilizado en solicitudes');
        return res.redirect('/residuos');
      }
      
      // Eliminar residuo
      await Residuo.destroy({ where: { id } });
      
      req.flash('success', 'Residuo eliminado correctamente');
      res.redirect('/residuos');
    } catch (error) {
      console.error('Error al eliminar residuo:', error);
      req.flash('error', 'Error al eliminar residuo');
      res.redirect('/residuos');
    }
  }
};

module.exports = residuoController;