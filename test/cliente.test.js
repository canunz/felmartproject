const request = require('supertest');
const { app } = require('../app');
const { Cliente, Usuario } = require('../models');
const { expect } = require('chai');

describe('Cliente Controller', () => {
  let testUsuario;
  let testCliente;
  let authToken;

  before(async () => {
    // Crear usuario administrador para pruebas
    testUsuario = await Usuario.create({
      email: 'admin@test.com',
      password: '123456',
      rol: 'administrador',
      activo: true
    });

    // Iniciar sesión para obtener token
    const loginResponse = await request(app)
      .post('/login')
      .send({
        email: 'admin@test.com',
        password: '123456'
      });

    authToken = loginResponse.headers['set-cookie'][0];

    // Crear cliente de prueba
    testCliente = await Cliente.create({
      rut: '12345678-9',
      nombreEmpresa: 'Empresa Test',
      direccion: 'Dirección Test',
      comuna: 'Comuna Test',
      ciudad: 'Ciudad Test',
      telefono: '+56912345678',
      email: 'test@example.com',
      contactoPrincipal: 'Contacto Test',
      usuarioId: testUsuario.id
    });
  });

  after(async () => {
    // Limpiar datos de prueba
    await Cliente.destroy({ where: {} });
    await Usuario.destroy({ where: {} });
  });

  describe('GET /api/clientes', () => {
    it('debería listar todos los clientes', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Cookie', authToken)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.clientes).to.be.an('array');
      expect(res.body.clientes.length).to.be.greaterThan(0);
    });

    it('debería denegar acceso sin autenticación', async () => {
      await request(app)
        .get('/api/clientes')
        .expect(401);
    });
  });

  describe('POST /api/clientes', () => {
    it('debería crear un nuevo cliente', async () => {
      const nuevoCliente = {
        rut: '98765432-1',
        nombreEmpresa: 'Nueva Empresa',
        direccion: 'Nueva Dirección',
        comuna: 'Nueva Comuna',
        ciudad: 'Nueva Ciudad',
        telefono: '+56987654321',
        email: 'nuevo@example.com',
        contactoPrincipal: 'Nuevo Contacto'
      };

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', authToken)
        .send(nuevoCliente)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.cliente).to.include({
        rut: nuevoCliente.rut,
        nombreEmpresa: nuevoCliente.nombreEmpresa
      });
    });

    it('debería fallar al crear cliente con RUT duplicado', async () => {
      const clienteDuplicado = {
        rut: '12345678-9', // RUT existente
        nombreEmpresa: 'Empresa Duplicada',
        direccion: 'Dirección Test',
        comuna: 'Comuna Test',
        ciudad: 'Ciudad Test',
        telefono: '+56912345678',
        email: 'duplicado@example.com',
        contactoPrincipal: 'Contacto Test'
      };

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', authToken)
        .send(clienteDuplicado)
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('RUT ya está registrado');
    });
  });

  describe('GET /api/clientes/:id', () => {
    it('debería obtener un cliente por ID', async () => {
      const res = await request(app)
        .get(`/api/clientes/${testCliente.id}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.cliente.id).to.equal(testCliente.id);
    });

    it('debería retornar 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/api/clientes/99999')
        .set('Cookie', authToken)
        .expect(404);

      expect(res.body.success).to.be.false;
    });
  });

  describe('PUT /api/clientes/:id', () => {
    it('debería actualizar un cliente', async () => {
      const datosActualizados = {
        nombreEmpresa: 'Empresa Actualizada',
        direccion: 'Dirección Actualizada'
      };

      const res = await request(app)
        .put(`/api/clientes/${testCliente.id}`)
        .set('Cookie', authToken)
        .send(datosActualizados)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.cliente.nombreEmpresa).to.equal(datosActualizados.nombreEmpresa);
    });

    it('debería fallar al actualizar con RUT duplicado', async () => {
      const otroCliente = await Cliente.create({
        rut: '11111111-1',
        nombreEmpresa: 'Otra Empresa',
        direccion: 'Otra Dirección',
        comuna: 'Otra Comuna',
        ciudad: 'Otra Ciudad',
        telefono: '+56911111111',
        email: 'otro@example.com',
        contactoPrincipal: 'Otro Contacto',
        usuarioId: testUsuario.id
      });

      const res = await request(app)
        .put(`/api/clientes/${otroCliente.id}`)
        .set('Cookie', authToken)
        .send({ rut: testCliente.rut })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('RUT ya está registrado');

      await otroCliente.destroy();
    });
  });

  describe('DELETE /api/clientes/:id', () => {
    it('debería eliminar un cliente', async () => {
      const clienteParaEliminar = await Cliente.create({
        rut: '22222222-2',
        nombreEmpresa: 'Empresa a Eliminar',
        direccion: 'Dirección',
        comuna: 'Comuna',
        ciudad: 'Ciudad',
        telefono: '+56922222222',
        email: 'eliminar@example.com',
        contactoPrincipal: 'Contacto',
        usuarioId: testUsuario.id
      });

      const res = await request(app)
        .delete(`/api/clientes/${clienteParaEliminar.id}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(res.body.success).to.be.true;

      // Verificar que el cliente fue eliminado
      const clienteEliminado = await Cliente.findByPk(clienteParaEliminar.id);
      expect(clienteEliminado).to.be.null;
    });

    it('debería retornar 404 al intentar eliminar cliente inexistente', async () => {
      const res = await request(app)
        .delete('/api/clientes/99999')
        .set('Cookie', authToken)
        .expect(404);

      expect(res.body.success).to.be.false;
    });
  });
}); 