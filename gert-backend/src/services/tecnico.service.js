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
    return tecnico;
  }

  async createTecnico(dadosTecnico) {
    const t = await sequelize.transaction();
    try {
      // 1. Criar o Usuário
      const dadosUsuario = {
        nome: dadosTecnico.nome,
        email: dadosTecnico.email,
        senha: dadosTecnico.senha,
        cargo: 'Técnico',
        ativo: dadosTecnico.ativo !== undefined ? dadosTecnico.ativo : true
      };
      const novoUsuario = await authService.register(dadosUsuario, { transaction: t });

      // 2. Criar o Técnico associado
      const dadosTecnicoFinal = {
        usuarioId: novoUsuario.id,
        especialidade: dadosTecnico.especialidade,
        disponivel: dadosTecnico.disponivel !== undefined ? dadosTecnico.disponivel : true
      };
      const novoTecnico = await Tecnico.create(dadosTecnicoFinal, { transaction: t });

      await t.commit();
      return this.getTecnicoById(novoTecnico.id);

    } catch (error) {
      await t.rollback();
      // Verifica se o erro é de e-mail duplicado
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('O email fornecido já está em uso.');
      }
      throw error;
    }
  }

  async updateTecnico(id, dadosTecnico) {
     const t = await sequelize.transaction();
     try {
        const tecnico = await Tecnico.findByPk(id, { transaction: t });
        if (!tecnico) {
            throw new Error('Técnico não encontrado');
        }

        // 1. Atualiza dados do técnico
        await tecnico.update({
            especialidade: dadosTecnico.especialidade,
            disponivel: dadosTecnico.disponivel
        }, { transaction: t });

        // 2. Atualiza dados do usuário associado
        const usuario = await Usuario.findByPk(tecnico.usuarioId, { transaction: t });
        if (usuario) {
            await usuario.update({
                nome: dadosTecnico.nome,
                email: dadosTecnico.email,
                ativo: dadosTecnico.ativo
            }, { transaction: t });
        }
        
        await t.commit();
        return this.getTecnicoById(id);

     } catch (error) {
         await t.rollback();
         if (error.name === 'SequelizeUniqueConstraintError') {
           throw new Error('O email fornecido já está em uso por outro usuário.');
         }
         throw error;
     }
  }
}
/*metodo delete
    const tecnicoService = require('../services/tecnico.service');

exports.delete = async (req, res) => {
  try {
    const resultado = await tecnicoService.deleteTecnico(req.params.id);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};*/

module.exports = new TecnicoService();
