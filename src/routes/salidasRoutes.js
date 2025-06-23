const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  verificarToken,
  esAdminBodegueroOFacturador, // Rol para la mayoría de las operaciones
  verificarRol // Para el caso de listar que incluye 'vendedor'
} = require('../middleware/auth');

// Importar el controlador
const {
  listarSalidas,
  obtenerSalida,
  crearSalida,
  actualizarSalida,
  completarSalida,
  cancelarSalida,
  eliminarSalida,
  generarReporte,
  obtenerEstadisticas,
  duplicarSalida
} = require('../controllers/salidasController');

// Aplicar autenticación a TODAS las rutas de salidas
router.use(verificarToken);

// Middleware para roles 'admin', 'bodeguero', 'facturador', 'vendedor'
// Se usará específicamente para listar, ya que es el único con todos los roles.
const esTodosLosRolesPermitidos = verificarRol('admin', 'bodeguero', 'facturador', 'vendedor');

// Validaciones comunes para ID en parámetro
const validarIdParam = [
  param('id').isInt().withMessage('ID de salida debe ser un número entero')
];

// Validaciones para la creación de salidas
const validarCreacionSalida = [
  body('tipo_salida').notEmpty().withMessage('Tipo de salida es requerido')
    .isIn(['venta', 'consignacion', 'maleta', 'ajuste', 'baja']).withMessage('Tipo de salida inválido'),
  body('cliente_id').optional({ nullable: true }).isInt().withMessage('ID de cliente debe ser un número entero'),
  body('maleta_id').optional({ nullable: true }).isInt().withMessage('ID de maleta debe ser un número entero'),
  body('observaciones').optional().isString().trim().isLength({ max: 500 }).withMessage('Observaciones muy largas'),
  body('detalles').isArray({ min: 1 }).withMessage('Detalles debe ser un array con al menos un ítem'),
  body('detalles.*.producto_id').isInt({ min: 1 }).withMessage('ID de producto debe ser un número entero positivo'),
  body('detalles.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser un entero mayor a 0'),
  body('detalles.*.precio_unitario').optional().isFloat({ min: 0 }).withMessage('Precio unitario debe ser un número positivo'),
  body('detalles.*.lote').optional().isString().trim().isLength({ max: 50 }).withMessage('Lote no debe exceder 50 caracteres')
];

// Validaciones para la actualización de salidas
const validarActualizacionSalida = [
  ...validarIdParam, // Incluye la validación del ID del parámetro
  body('tipo_salida').optional().notEmpty().withMessage('Tipo de salida no puede estar vacío')
    .isIn(['venta', 'consignacion', 'maleta', 'ajuste', 'baja']).withMessage('Tipo de salida inválido'),
  body('cliente_id').optional({ nullable: true }).isInt().withMessage('ID de cliente debe ser un número entero'),
  body('maleta_id').optional({ nullable: true }).isInt().withMessage('ID de maleta debe ser un número entero'),
  body('observaciones').optional().isString().trim().isLength({ max: 500 }).withMessage('Observaciones muy largas'),
  body('estado').optional().isIn(['pendiente', 'procesada', 'anulada']).withMessage('Estado inválido'),
  // Los detalles en la actualización son más complejos y generalmente no se actualizan todos de una vez.
  // Si se permite actualizar detalles, se necesitarían validaciones más específicas aquí o en un endpoint dedicado.
  body('detalles').optional().isArray().withMessage('Detalles debe ser un array'),
  body('detalles.*.id').optional().isInt().withMessage('ID de detalle debe ser un entero (para actualizar existentes)'),
  body('detalles.*.producto_id').optional().isInt({ min: 1 }).withMessage('ID de producto debe ser un número entero positivo'),
  body('detalles.*.cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad debe ser un entero mayor a 0'),
  body('detalles.*.precio_unitario').optional().isFloat({ min: 0 }).withMessage('Precio unitario debe ser un número positivo'),
  body('detalles.*.lote').optional().isString().trim().isLength({ max: 50 }).withMessage('Lote no debe exceder 50 caracteres')
];

// RUTAS

// GET /api/salidas - Listar salidas (admin, bodeguero, facturador, vendedor)
router.get('/', esTodosLosRolesPermitidos, listarSalidas);

// GET /api/salidas/reporte - Generar reporte (admin, bodeguero, facturador)
router.get('/reporte', esAdminBodegueroOFacturador, generarReporte);

// GET /api/salidas/estadisticas - Obtener estadísticas (admin, bodeguero, facturador)
router.get('/estadisticas', esAdminBodegueroOFacturador, obtenerEstadisticas);

// GET /api/salidas/:id - Obtener salida por ID (admin, bodeguero, facturador)
router.get('/:id', esAdminBodegueroOFacturador, validarIdParam, obtenerSalida);

// POST /api/salidas - Crear nueva salida (admin, bodeguero, facturador)
router.post('/', esAdminBodegueroOFacturador, validarCreacionSalida, crearSalida);

// POST /api/salidas/:id/duplicar - Duplicar salida (admin, bodeguero, facturador)
router.post('/:id/duplicar', esAdminBodegueroOFacturador, validarIdParam, duplicarSalida);

// PUT /api/salidas/:id - Actualizar salida (admin, bodeguero, facturador)
router.put('/:id', esAdminBodegueroOFacturador, validarActualizacionSalida, actualizarSalida);

// PATCH /api/salidas/:id/completar - Completar salida (admin, bodeguero, facturador)
router.patch('/:id/completar', esAdminBodegueroOFacturador, validarIdParam, completarSalida);

// PATCH /api/salidas/:id/cancelar - Cancelar salida (Anular) (admin, bodeguero, facturador)
router.patch('/:id/cancelar', esAdminBodegueroOFacturador, [
  ...validarIdParam,
  body('motivo_cancelacion').optional({ checkFalsy: true }).isString().trim().isLength({ min: 5, max: 255 }).withMessage('El motivo de cancelación debe tener entre 5 y 255 caracteres')
], cancelarSalida);

// DELETE /api/salidas/:id - Eliminar salida (admin, bodeguero, facturador)
router.delete('/:id', esAdminBodegueroOFacturador, validarIdParam, eliminarSalida);

module.exports = router;
