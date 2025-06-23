const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Verificar token JWT
const verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario
    const usuario = await Usuario.buscarPorId(decoded.id);
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido - Usuario no encontrado'
      });
    }
    
    // Agregar usuario a la request
    req.usuario = usuario;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    // Enviar al errorHandler global para otros errores
    next(error);
  }
};

// Verificar rol específico
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      // Este caso debería ser manejado por verificarToken primero,
      // pero es una salvaguarda. El errorHandler debería dar un 500 si esto ocurre.
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }
    
    next();
  };
};

// Verificar si es admin
const esAdmin = verificarRol('admin');

// Verificar si es admin o facturador
const esAdminOFacturador = verificarRol('admin', 'facturador');

// Verificar si es admin o bodeguero
const esAdminOBodeguero = verificarRol('admin', 'bodeguero');

// Verificar si es admin, bodeguero o facturador
const esAdminBodegueroOFacturador = verificarRol('admin', 'bodeguero', 'facturador');

// Middleware opcional - si hay token lo verifica, si no, continúa
const autenticacionOpcional = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuario = await Usuario.buscarPorId(decoded.id);
      
      if (usuario) {
        req.usuario = usuario;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Si hay error con el token (inválido, expirado), simplemente continuar sin usuario.
    // No se debe enviar un error al cliente por un token opcional que resulta ser inválido.
    next();
  }
};

module.exports = {
  verificarToken,
  verificarRol,
  esAdmin,
  esAdminOFacturador,
  esAdminOBodeguero,
  esAdminBodegueroOFacturador, // Asegúrate de que esta línea esté
  autenticacionOpcional
};
