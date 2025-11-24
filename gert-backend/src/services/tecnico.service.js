const { Tecnico, Usuario, sequelize } = require('../models');
const authService = require('./auth.service');
const { Op } = require('sequelize');

class TecnicoService {
  async getAllTecnicos(queryParams) {
    const { searchTerm, page = 1, limit = 10 } = queryParams;
    
    // Validar paginação
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let where = {};

    if (searchTerm && searchTerm !== 'undefined' && searchTerm !== 'null' && searchTerm.trim() !== '') {
      const termo = searchTerm.trim();
      where[Op.or] = [
        { '$usuario.nome$': { [Op.like]: `%${termo}%` } },
        { '$usuario.email$': { [Op.like]: `%${termo}%` } },
        { especialidade: { [Op.like]: `%${termo}%` } },
      ];
    }
    
    where['$usuario.cargo$'] = 'Técnico';

    const { count, rows } = await Tecnico.findAndCountAll({
      where,
      include: [{ model: Usuario, as: 'usuario' }],
      limit: limitNum,
      offset: offset,
      order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']],
    });
    return { totalItems: count, totalPages: Math.ceil(count / limitNum), currentPage: pageNum, tecnicos: rows };
  }
  
  async getTecnicoById(id) {
    const tecnico = await Tecnico.findByPk(id, {
      include: [{ model: Usuario, as: 'usuario' }]
    });
    if (!tecnico) {
      throw new Error('Técnico não encontrado');
    }
    retu
