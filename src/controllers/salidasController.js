const { validationResult } = require('express-validator');
const Salida = require('../models/Salida');
const Maleta = require('../models/Maleta');
const Cliente = require('../models/Cliente');
const Producto = require('../models/Producto');

// Listar salidas
const listarSalidas = async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limite = 20,
      buscar = '',
      tipo_salida,
      cliente_id,
      maleta_id,
      estado,
      fecha_inicio,
      fecha_fin,
      pendientes_facturar,
      orden = 'fecha',
      direccion = 'DESC'
    } = req.query;

    const opciones = {
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      buscar,
      tipo_salida,
      cliente_id: cliente_id ? parseInt(cliente_id) : null,
      maleta_id: maleta_id ? parseInt(maleta_id) : null,
      estado,
      fecha_inicio,
      fecha_fin,
      pendientes_facturar: pendientes_facturar === 'true',
      orden,
      direccion: direccion.toUpperCase()
    };

    const resultado = await Salida.listar(opciones);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};

// Obtener salida por ID
const obtenerSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const salida = await Salida.buscarPorId(id);
    
    if (!salida) {
      return res.status(404).json({
        success: false,
        message: 'Salida no encontrada'
      });
    }

    // Obtener detalles
    salida.detalles = await Salida.obtenerDetalles(id);

    res.json({
      success: true,
      data: salida
    });
  } catch (error) {
    next(error);
  }
};

// Crear nueva salida
const crearSalida = async (req, res, next) => {
  try {
    // Validar errores de entrada
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: errores.array()
      });
    }

    const {
      tipo_salida,
      cliente_id,
      maleta_id,
      observaciones,
      detalles = []
    } = req.body;

    // Validar que el cliente existe (si se proporciona)
    if (cliente_id) {
      const cliente = await Cliente.buscarPorId(cliente_id);
      if (!cliente) {
        return res.status(400).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }
    }

    // Validar que la maleta existe (si se proporciona)
    if (maleta_id) {
      const maleta = await Maleta.buscarPorId(maleta_id);
      if (!maleta) {
        return res.status(400).json({
          success: false,
          message: 'Maleta no encontrada'
        });
      }
    }

    // Validar productos en los detalles
    for (const detalle of detalles) {
      const producto = await Producto.buscarPorId(detalle.producto_id);
      if (!producto) {
        return res.status(400).json({
          success: false,
          message: `Producto con ID ${detalle.producto_id} no encontrado`
        });
      }

      // Esta validación de stock es una verificación rápida. 
      // El modelo Salida.crear hará la verificación final contra lotes específicos.
      if (producto.stock_actual < detalle.cantidad) { // Usar stock_actual del producto si está disponible y es relevante
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para el producto ${producto.descripcion}. Stock disponible: ${producto.stock_actual}`
        });
      }
    }

    const datosSalida = {
      tipo_salida,
      cliente_id,
      maleta_id,
      observaciones,
      // estado: 'pendiente', // El modelo Salida.crear lo establece como 'procesada'
      fecha: new Date(),
      usuario_id: req.usuario.id // Corregido de req.user a req.usuario
    };

    const nuevaSalida = await Salida.crear(datosSalida, detalles);

    // Devolver la salida completa con detalles
    const salidaCompleta = await Salida.buscarPorId(nuevaSalida.id);
    if (salidaCompleta) {
      salidaCompleta.detalles = await Salida.obtenerDetalles(nuevaSalida.id);
    }

    res.status(201).json({
      success: true,
      message: 'Salida creada exitosamente',
      data: salidaCompleta || nuevaSalida // Fallback por si buscarPorId falla inmediatamente
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar salida
const actualizarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errores: errores.array()
      });
    }

    const salidaExistente = await Salida.buscarPorId(id);
    if (!salidaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Salida no encontrada'
      });
    }

    if (salidaExistente.estado === 'anulada' || salidaExistente.factura_id) {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una salida anulada o facturada.'
      });
    }

    // Lógica para llamar a Salida.actualizar (que necesita ser implementada en el modelo)
    // Por ahora, este controlador asumirá que Salida.actualizar existe.
    // const { /* campos actualizables */ } = req.body;
    // const datosActualizacion = { /* ... */ }; 
    // const detalles = req.body.detalles; // Si se permite actualizar detalles

    // Esto es un placeholder ya que Salida.actualizar no está implementado en el modelo
    // const salidaActualizada = await Salida.actualizar(id, req.body, req.usuario.id);
    // res.json({
    //   success: true,
    //   message: 'Salida actualizada exitosamente',
    //   data: salidaActualizada
    // });

    return res.status(501).json({ success: false, message: 'Funcionalidad de actualizar salida no implementada completamente.' });

  } catch (error) {
    next(error);
  }
};

// Completar salida
const completarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const salida = await Salida.buscarPorId(id);
    if (!salida) {
      return res.status(404).json({
        success: false,
        message: 'Salida no encontrada'
      });
    }

    // Lógica para llamar a Salida.completar (que necesita ser implementada en el modelo)
    // if (salida.estado === 'completada') { // 'completada' o el estado final que defina el modelo
    //   return res.status(400).json({
    //     success: false,
    //     message: 'La salida ya está completada'
    //   });
    // }
    // const salidaCompletada = await Salida.completar(id, req.usuario.id);
    // res.json({
    //   success: true,
    //   message: 'Salida completada exitosamente',
    //   data: salidaCompletada
    // });

    return res.status(501).json({ success: false, message: 'Funcionalidad de completar salida no implementada completamente.' });

  } catch (error) {
    next(error);
  }
};

// Cancelar salida (Anular)
const cancelarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    // const { motivo_cancelacion } = req.body; // El modelo Salida.anular actual no usa motivo.
    
    // Verificar que la salida existe antes de intentar anularla
    const salida = await Salida.buscarPorId(id);
    if (!salida) {
      return res.status(404).json({
        success: false,
        message: 'Salida no encontrada'
      });
    }

    // El método Salida.anular ya contiene validaciones internas (ej. si está facturada)
    await Salida.anular(id, req.usuario.id);

    res.json({
      success: true,
      message: 'Salida anulada exitosamente'
    });
  } catch (error) {
    // Manejar errores específicos que Salida.anular pueda lanzar
    if (error.message.includes('No se puede anular una salida que ya fue facturada') || 
        error.message.includes('Salida no encontrada o ya está anulada')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Eliminar salida
const eliminarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // const salida = await Salida.buscarPorId(id); // Verificación opcional previa
    // if (!salida) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Salida no encontrada'
    //   });
    // }
    // if (salida.estado !== 'pendiente') { // Lógica de negocio que debería estar en el modelo
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Solo se pueden eliminar salidas en estado pendiente'
    //   });
    // }

    // await Salida.eliminar(id, req.usuario.id); // Necesita ser implementado en el modelo

    // res.json({
    //   success: true,
    //   message: 'Salida eliminada exitosamente'
    // });
    return res.status(501).json({ success: false, message: 'Funcionalidad de eliminar salida no implementada.' });

  } catch (error) {
    next(error);
  }
};

// Generar reporte de salidas
const generarReporte = async (req, res, next) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      tipo_salida,
      cliente_id,
      estado,
      formato = 'json'
    } = req.query;

    const filtros = {
      fecha_inicio,
      fecha_fin,
      tipo_salida,
      cliente_id: cliente_id ? parseInt(cliente_id) : null,
      estado
    };

    // const reporte = await Salida.generarReporte(filtros); // Necesita ser implementado en el modelo
    // if (formato === 'csv' && reporte.csv) {
    //   res.setHeader('Content-Type', 'text/csv');
    //   res.setHeader('Content-Disposition', 'attachment; filename=reporte_salidas.csv');
    //   return res.send(reporte.csv);
    // }
    // res.json({
    //   success: true,
    //   data: reporte
    // });
    return res.status(501).json({ success: false, message: 'Funcionalidad de generar reporte no implementada.' });

  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de salidas
const obtenerEstadisticas = async (req, res, next) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      // tipo_salida, // El modelo actual no lo usa, pero podría añadirse
      agrupacion = 'mes' // El modelo actual no usa 'agrupacion'
    } = req.query;

    const filtros = {
      fecha_inicio,
      fecha_fin,
      tipo_salida: req.query.tipo_salida
    };

    const estadisticas = await Salida.obtenerEstadisticas(filtros);

    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    next(error);
  }
};

// Duplicar salida
const duplicarSalida = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // const salidaOriginal = await Salida.buscarPorId(id); // Verificación opcional
    // if (!salidaOriginal) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Salida no encontrada'
    //   });
    // }

    // const salidaDuplicada = await Salida.duplicar(id, req.usuario.id); // Necesita ser implementado en el modelo

    // res.status(201).json({
    //   success: true,
    //   message: 'Salida duplicada exitosamente',
    //   data: salidaDuplicada
    // });
    return res.status(501).json({ success: false, message: 'Funcionalidad de duplicar salida no implementada.' });

  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
