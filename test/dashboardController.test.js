const { expect } = require('chai');
const sinon = require('sinon');
const sequelize = require('../config/test');
const { Usuario, SolicitudRetiro, VisitaRetiro } = require('../models');
const dashboardController = require('../controllers/dashboardController');

describe('Dashboard Controller', () => {
    let usuarioStub, solicitudStub, visitaStub;

    before(async () => {
        // Sincronizar la base de datos de prueba
        await sequelize.sync({ force: true });
    });

    beforeEach(() => {
        // Crear stubs para los modelos
        usuarioStub = sinon.stub(Usuario, 'count');
        solicitudStub = sinon.stub(SolicitudRetiro, 'count');
        visitaStub = sinon.stub(VisitaRetiro, 'count');
    });

    afterEach(() => {
        // Restaurar todos los stubs
        sinon.restore();
    });

    after(async () => {
        // Cerrar la conexión
        await sequelize.close();
    });

    describe('getAdminStats', () => {
        it('debería obtener todas las estadísticas correctamente', async () => {
            // Configurar los stubs para devolver valores de prueba
            usuarioStub.returns(Promise.resolve(10)); // 10 clientes
            solicitudStub.returns(Promise.resolve(5)); // 5 solicitudes pendientes
            visitaStub.withArgs({
                where: {
                    fechaProgramada: sinon.match.any
                }
            }).returns(Promise.resolve(3)); // 3 visitas hoy
            visitaStub.withArgs({
                where: {
                    estado: 'completada'
                }
            }).returns(Promise.resolve(15)); // 15 servicios completados

            // Llamar a la función y verificar resultados
            const stats = await dashboardController.getAdminStats();

            expect(stats).to.deep.equal({
                totalClientes: 10,
                solicitudesPendientes: 5,
                visitasHoy: 3,
                serviciosCompletados: 15
            });

            // Verificar que los stubs fueron llamados
            expect(usuarioStub.calledOnce).to.be.true;
            expect(solicitudStub.calledOnce).to.be.true;
            expect(visitaStub.calledTwice).to.be.true;
        });

        it('debería manejar errores correctamente', async () => {
            // Simular un error en la consulta
            usuarioStub.throws(new Error('Error de base de datos'));

            try {
                await dashboardController.getAdminStats();
                // Si llegamos aquí, la prueba debería fallar
                expect.fail('Debería haber lanzado un error');
            } catch (error) {
                expect(error).to.be.an('error');
                expect(error.message).to.equal('Error de base de datos');
            }
        });
    });

    describe('renderAdminDashboard', () => {
        it('debería renderizar la vista con las estadísticas correctas', async () => {
            // Crear stubs para req y res
            const req = {
                session: {
                    usuario: { id: 1, nombre: 'Admin Test' }
                }
            };
            const res = {
                render: sinon.spy(),
                redirect: sinon.spy()
            };

            // Configurar los stubs para las estadísticas
            usuarioStub.returns(Promise.resolve(10));
            solicitudStub.returns(Promise.resolve(5));
            visitaStub.returns(Promise.resolve(3));

            // Llamar al controlador
            await dashboardController.renderAdminDashboard(req, res);

            // Verificar que se llamó a render con los parámetros correctos
            expect(res.render.calledOnce).to.be.true;
            expect(res.render.firstCall.args[0]).to.equal('dashboard/admin');
            expect(res.render.firstCall.args[1]).to.include({
                totalClientes: 10,
                solicitudesPendientes: 5,
                visitasHoy: 3,
                serviciosCompletados: 3
            });
        });

        it('debería manejar errores y redirigir', async () => {
            // Crear stubs para req y res
            const req = {
                session: {
                    usuario: { id: 1, nombre: 'Admin Test' }
                },
                flash: sinon.spy()
            };
            const res = {
                redirect: sinon.spy()
            };

            // Simular un error
            usuarioStub.throws(new Error('Error de prueba'));

            // Llamar al controlador
            await dashboardController.renderAdminDashboard(req, res);

            // Verificar que se llamó a flash y redirect
            expect(req.flash.calledWith('error', 'Error al cargar el dashboard')).to.be.true;
            expect(res.redirect.calledWith('/')).to.be.true;
        });
    });
}); 