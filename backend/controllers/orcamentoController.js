const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const productFiscalRulesService = require('../services/productFiscalRulesService');
const fiscalRulesService = require('../services/fiscalRulesService');

/**
 * Calcula o total de descontos e o valor com desconto para um orçamento
 * @param {Array} itens - Lista de itens do orçamento
 * @returns {Object} - Objeto com valor de desconto e valor com desconto
 */
const calcularTotaisDesconto = (itens) => {
  let valorTotal = 0;
  let valorDesconto = 0;
  let valorComDesconto = 0;
  let valorIpi = 0;
  let valorSt = 0;

  console.log('🔄 CALCULANDO TOTAIS NO BACKEND - Recebendo itens:', itens.length);

  itens.forEach((item, index) => {
    console.log(`📝 ITEM ${index + 1} - BACKEND TOTAIS:`, {
      produto_codigo: item.produto_codigo,
      valoresRecebidos: {
        valor_bruto: item.valor_bruto,
        valor_desconto: item.valor_desconto,
        valor_liquido: item.valor_liquido,
        valor_com_desconto: item.valor_com_desconto,
        valor_ipi: item.valor_ipi,
        valor_icms_st: item.valor_icms_st
      }
    });

    // CORREÇÃO: Usar valores já calculados do frontend ao invés de recalcular
    const valorBrutoItem = parseFloat(item.valor_bruto) || 0;
    const valorDescontoItem = parseFloat(item.valor_desconto) || 0;
    const valorComDescontoItem = parseFloat(item.valor_com_desconto) || parseFloat(item.valor_liquido) || 0;
    const valorIpiItem = parseFloat(item.valor_ipi) || 0;
    const valorStItem = parseFloat(item.valor_icms_st) || 0;
    
    console.log(`💰 VALORES PROCESSADOS ITEM ${index + 1}:`, {
      valorBrutoItem,
      valorDescontoItem,
      valorComDescontoItem,
      valorIpiItem,
      valorStItem
    });
    
    // Totalizar usando valores do frontend
    valorTotal += valorBrutoItem;
    valorDesconto += valorDescontoItem;
    valorComDesconto += valorComDescontoItem;
    valorIpi += valorIpiItem;
    valorSt += valorStItem;
    
    console.log(`📊 TOTAIS ACUMULADOS ATÉ ITEM ${index + 1}:`, {
      valorTotal,
      valorDesconto,
      valorComDesconto,
      valorIpi,
      valorSt
    });
  });
  
  console.log('✅ TOTAIS FINAIS CALCULADOS NO BACKEND:', {
    valorTotal,
    valorDesconto,
    valorComDesconto,
    valorIpi,
    valorSt
  });
  
  return { valorTotal, valorDesconto, valorComDesconto, valorIpi, valorSt };
};

// Função de arredondamento aritmético preciso para evitar problemas de ponto flutuante
const arredondar = (valor, casas = 2) => {
  const numeroValido = Number(valor);
  if (numeroValido === 0 || isNaN(numeroValido)) {
    return 0;
  }
  const fator = Math.pow(10, casas);
  return Math.round((numeroValido + Number.EPSILON) * fator) / fator;
};

module.exports = {
  async list(req, res) {
    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de acessar orçamentos'
        });
      }

      let query = db('orcamentos')
        .select('orcamentos.*')
        .leftJoin('clientes', 'orcamentos.cod_cliente', 'clientes.codigo')
        .leftJoin('vendedores', 'orcamentos.cod_vendedor', 'vendedores.codigo');

      // Se não for admin e tiver vendedor vinculado, filtrar apenas os orçamentos do vendedor
      if (req.userRole !== 'admin' && req.vendedor) {
        query = query.where('orcamentos.cod_vendedor', req.vendedor.codigo);
      }

      const orcamentos = await query;

      return res.json({
        success: true,
        data: orcamentos
      });
    } catch (error) {
      console.error('Erro ao listar orçamentos:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async getById(req, res) {
    const { id } = req.params;

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de acessar orçamentos'
        });
      }

      // Buscar orçamento sem os joins que estavam causando erro
      const orcamento = await db('orcamentos')
        .where('orcamentos.codigo', id)
        .first();

      if (!orcamento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Orçamento não encontrado' 
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamento.cod_vendedor !== req.vendedor.codigo) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este orçamento'
        });
      }

      // Buscar itens do orçamento com informações de produtos
      const itens = await db('orcamentos_itens')
        .where('orcamento_codigo', id)
        .leftJoin('produtos', function() {
          this.on('produtos.codigo', '=', 'orcamentos_itens.produto_codigo')
              .andOn('produtos.cod_empresa', '=', db.raw('1')); // Assumindo empresa 1 como padrão
        })
        .select(
          'orcamentos_itens.codigo',
          'orcamentos_itens.orcamento_codigo',
          'orcamentos_itens.produto_codigo',
          'orcamentos_itens.quantidade',
          'orcamentos_itens.valor_unitario',
          'orcamentos_itens.valor_bruto',
          'orcamentos_itens.valor_desconto',
          'orcamentos_itens.valor_liquido',
          'orcamentos_itens.valor_com_desconto',
          'orcamentos_itens.valor_total',
          'orcamentos_itens.desconto',
          'orcamentos_itens.st_icms',
          'orcamentos_itens.valor_icms_st',
          'orcamentos_itens.aliq_icms',
          'orcamentos_itens.valor_icms',
          'orcamentos_itens.aliq_ipi',
          'orcamentos_itens.valor_ipi',
          db.raw('COALESCE(produtos.nome, produtos.descricao, CONCAT(\'Produto \', orcamentos_itens.produto_codigo)) as produto_descricao'),
          'produtos.unidade',
          'orcamentos_itens.unidade as item_unidade',
          'orcamentos_itens.is_unidade2'
        )
        .orderBy('orcamentos_itens.dt_inc');

      // Log para debug da consulta
      console.log('Query dos itens:', itens.toString());

      // Processar itens para incluir informações adicionais
      const itensProcessados = await Promise.all(itens.map(async (item) => {
        // Obter dados fiscais do produto
        let dadosFiscais = null;
        try {
          dadosFiscais = await fiscalRulesService.getDadosFiscaisProduto(item.produto_codigo);
          console.log(`Dados fiscais recuperados para produto ${item.produto_codigo}:`, dadosFiscais);
        } catch (error) {
          console.error(`Erro ao buscar dados fiscais do produto ${item.produto_codigo}:`, error);
        }
  
        // Garantir que os valores sejam numéricos - USAR VALORES DO BANCO
        const quantidade = parseFloat(item.quantidade) || 0;
        const valorUnitario = parseFloat(item.valor_unitario) || 0;
        const valorBruto = parseFloat(item.valor_bruto) || (quantidade * valorUnitario); // Preferir valor do banco
        const desconto = parseFloat(item.desconto || 0);
        const valorDesconto = parseFloat(item.valor_desconto) || ((valorBruto * desconto) / 100); // Preferir valor do banco
        const valorLiquido = parseFloat(item.valor_liquido) || (valorBruto - valorDesconto); // Preferir valor do banco
        const valorComDesconto = parseFloat(item.valor_com_desconto) || valorLiquido; // USAR valor do banco
        
        console.log(`⚠️ BACKEND GET_BY_ID - Item ${item.produto_codigo}:`, {
          valoresDoBanco: {
            valor_bruto_banco: item.valor_bruto,
            valor_desconto_banco: item.valor_desconto,
            valor_liquido_banco: item.valor_liquido,
            valor_com_desconto_banco: item.valor_com_desconto
          },
          valoresProcessados: {
            valorBruto,
            valorDesconto,
            valorLiquido,
            valorComDesconto
          }
        });
        
        return {
          ...item,
          valor_bruto: valorBruto.toFixed(2),
          valor_desconto: valorDesconto.toFixed(2),
          valor_liquido: valorLiquido.toFixed(2),
          valor_com_desconto: valorComDesconto.toFixed(2),
          valor_total: valorComDesconto.toFixed(2),
          // Adicionar campos de unidade
          unidade: item.item_unidade || item.unidade,
          is_unidade2: item.is_unidade2 === true ? true : false
        };
      }));

      // Calcular totais do orçamento
      const totais = itensProcessados.reduce((acc, item) => {
        acc.valor_produtos += parseFloat(item.valor_bruto) || 0;
        acc.valor_descontos += parseFloat(item.valor_desconto) || 0;
        acc.valor_liquido += parseFloat(item.valor_com_desconto) || 0;
        acc.valor_ipi += parseFloat(item.valor_ipi) || 0;
        acc.valor_st += parseFloat(item.valor_icms_st) || 0;
        acc.valor_total += parseFloat(item.valor_com_desconto) || 0;
        return acc;
      }, {
        valor_produtos: 0,
        valor_descontos: 0,
        valor_liquido: 0,
        valor_ipi: 0,
        valor_st: 0,
        valor_total: 0
      });

      // Mapear os campos de pagamento para os nomes esperados pelo frontend
      const orcamentoComCamposMapeados = {
        ...orcamento,
        // Mapear os campos para os nomes esperados pelo frontend
        form_pagto: orcamento.cod_forma_pagto,
        cond_pagto: orcamento.cod_cond_pagto,
        itens: itensProcessados,
        totais: totais
      };

      // Log para debug dos campos mapeados
      console.log('Campos de pagamento mapeados:', {
        cod_forma_pagto: orcamento.cod_forma_pagto,
        form_pagto: orcamentoComCamposMapeados.form_pagto,
        cod_cond_pagto: orcamento.cod_cond_pagto,
        cond_pagto: orcamentoComCamposMapeados.cond_pagto
      });

      return res.json(orcamentoComCamposMapeados);
    } catch (error) {
      console.error('Erro ao buscar orçamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  async create(req, res) {
    const trx = await db.transaction();

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        await trx.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de criar orçamentos'
        });
      }

      const { 
        dt_orcamento, 
        cod_cliente, 
        cod_vendedor, 
        cod_transportadora,
        nome_transportadora,
        observacoes, 
        form_pagto, 
        cond_pagto,
        itens 
      } = req.body;

      // Validações - garantir que todos os campos obrigatórios estão presentes
      if (!cod_cliente) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cliente é obrigatório'
        });
      }

      // Se não for admin, usar o vendedor vinculado ao usuário
      let vendedorCodigo = cod_vendedor;
      if (req.userRole !== 'admin') {
        if (!req.vendedor) {
          await trx.rollback();
          return res.status(400).json({
            success: false,
            message: 'Usuário não possui vendedor vinculado'
          });
        }
        vendedorCodigo = req.vendedor.codigo;
      } else if (!cod_vendedor) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          message: 'Vendedor é obrigatório'
        });
      }

      if (!itens || itens.length === 0) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          message: 'Itens são obrigatórios'
        });
      }

      // Calcular totais
      const { valorDesconto, valorTotal, valorComDesconto, valorIpi, valorSt } = calcularTotaisDesconto(itens);

      // Log para debug (adicionado)
      console.log('Valores de pagamento (create):', {
        form_pagto_recebido: form_pagto,
        cond_pagto_recebido: cond_pagto,
        cod_vendedor
      });

      // Inserir orçamento - removendo os campos que não existem na tabela
      const [orcamentoCodigo] = await trx('orcamentos').insert({
        codigo: uuidv4(),
        dt_orcamento: dt_orcamento || new Date(),
        cod_cliente,
        cod_vendedor: vendedorCodigo,
        cod_transportadora,
        nome_transportadora,
        cod_empresa: 1,
        observacoes,
        dt_inc: new Date(),
        // Usar os nomes corretos dos campos no banco de dados
        cod_forma_pagto: form_pagto,
        cod_cond_pagto: cond_pagto,
        vl_desconto: arredondar(valorDesconto, 2),
        vl_produtos: arredondar(valorTotal, 2),
        vl_com_desconto: arredondar(valorComDesconto, 2),
        vl_ipi: arredondar(valorIpi, 2),
        vl_st: arredondar(valorSt, 2),
        vl_total: arredondar(arredondar(valorComDesconto, 2) + arredondar(valorIpi, 2) + arredondar(valorSt, 2), 2), // Total final
        cod_status: 1
      }, ['codigo']);

      // Log para debug
      console.log('Orçamento criado com código:', orcamentoCodigo);

      // Corrigir o formato do código do orçamento, garantindo que seja uma string
      const orcamentoCodigoStr = typeof orcamentoCodigo === 'object' && orcamentoCodigo !== null ? 
                                orcamentoCodigo.codigo || orcamentoCodigo.toString() : 
                                String(orcamentoCodigo);
      
      console.log('Código do orçamento formatado:', orcamentoCodigoStr);

      // Processar e buscar dados fiscais para cada item
      const itensProcessados = await Promise.all(itens.map(async (item) => {
        // Obter dados fiscais do produto
        let dadosFiscais = null;
        try {
          dadosFiscais = await fiscalRulesService.getDadosFiscaisProduto(item.produto_codigo);
          console.log(`Dados fiscais recuperados para produto ${item.produto_codigo}:`, dadosFiscais);
        } catch (error) {
          console.error(`Erro ao buscar dados fiscais do produto ${item.produto_codigo}:`, error);
        }

        // Garantir que os valores sejam numéricos
        const quantidade = parseFloat(item.quantidade) || 0;
        const valorUnitario = parseFloat(item.valor_unitario) || 0;
        
        // CORREÇÃO: Usar valores já calculados no frontend seguindo a lógica do ERP
        const valorBruto = parseFloat(item.valor_bruto) || (quantidade * valorUnitario);
        const desconto = parseFloat(item.desconto || 0);
        const valorDesconto = parseFloat(item.valor_desconto) || ((valorBruto * desconto) / 100);
        const valorLiquido = parseFloat(item.valor_liquido) || (valorBruto - valorDesconto);
        const valorComDesconto = parseFloat(item.valor_com_desconto) || valorLiquido;
        
        // CORREÇÃO: Usar valores de tributos já calculados e salvos no banco
        const aliqIcms = parseFloat(item.aliq_icms) || parseFloat(dadosFiscais?.aliq_icms || 0);
        const aliqIpi = parseFloat(item.aliq_ipi) || parseFloat(dadosFiscais?.aliq_ipi || 0);
        const valorIcms = parseFloat(item.valor_icms) || 0;
        const valorIpi = parseFloat(item.valor_ipi) || 0;
        const valorIcmsSt = parseFloat(item.valor_icms_st) || 0;
        
        console.log(`⚠️ BACKEND - Processando item ${item.produto_codigo}:`, {
          valoresRecebidosDoFrontend: {
            valor_bruto: item.valor_bruto,
            valor_desconto: item.valor_desconto,
            valor_liquido: item.valor_liquido,
            valor_ipi: item.valor_ipi,
            aliq_ipi: item.aliq_ipi
          },
          valoresProcessados: {
            valorBruto,
            valorDesconto,
            valorLiquido,
            valorIpi,
            aliqIpi
          },
          valoresArredondados: {
            valor_bruto: arredondar(valorBruto, 2),
            valor_desconto: arredondar(valorDesconto, 2),
            valor_liquido: arredondar(valorLiquido, 2),
            valor_ipi: arredondar(valorIpi, 2),
            valor_total: arredondar(arredondar(valorLiquido, 2) + arredondar(valorIpi, 2) + arredondar(valorIcmsSt, 2), 2)
          }
        });
        
        return {
          codigo: uuidv4(),
          orcamento_codigo: orcamentoCodigoStr,
          produto_codigo: item.produto_codigo,
          quantidade,
          valor_unitario: arredondar(valorUnitario, 2),
          valor_bruto: arredondar(valorBruto, 2),
          valor_desconto: arredondar(valorDesconto, 2),
          valor_liquido: arredondar(valorLiquido, 2),
          valor_com_desconto: valorComDesconto.toFixed(2),
          valor_total: arredondar(arredondar(valorComDesconto, 2) + arredondar(valorIpi, 2) + arredondar(valorIcmsSt, 2), 2),
          // Campos fiscais
          desconto: arredondar(desconto, 2),
          st_icms: dadosFiscais?.st_icms || '00',
          aliq_icms: arredondar(aliqIcms, 2),
          valor_icms: arredondar(valorIcms, 2),
          icms_st: valorIcmsSt > 0 ? 'S' : 'N',
          valor_icms_st: arredondar(valorIcmsSt, 2),
          ipi: arredondar(aliqIpi, 2),
          valor_ipi: arredondar(valorIpi, 2),
          class_fiscal: dadosFiscais?.class_fiscal || '',
          ncm: dadosFiscais?.ncm || '',
          cod_origem_prod: dadosFiscais?.cod_origem_prod || '0',
          cod_status: 1,
          dt_inc: new Date(),
          // Adicionar campos de unidade
          unidade: item.unidade || '',
          is_unidade2: item.is_unidade2 === true ? true : false
        };
      }));

      // Inserir itens do orçamento
      await trx('orcamentos_itens').insert(itensProcessados);

      // Commit da transação
      await trx.commit();

      return res.status(201).json({ 
        success: true, 
        codigo: orcamentoCodigoStr,
        message: 'Orçamento criado com sucesso' 
      });
    } catch (error) {
      // Rollback em caso de erro
      await trx.rollback();
      console.error('Erro ao criar orçamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const trx = await db.transaction();

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        await trx.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de atualizar orçamentos'
        });
      }

      const { 
        dt_orcamento, 
        cod_cliente, 
        cod_vendedor, 
        cod_transportadora,
        nome_transportadora,
        observacoes, 
        form_pagto, 
        cond_pagto,
        itens = [] 
      } = req.body;

      // Validar se o orçamento existe
      const orcamentoExistente = await trx('orcamentos')
        .where('codigo', id)
        .first();

      if (!orcamentoExistente) {
        await trx.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Orçamento não encontrado' 
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamentoExistente.cod_vendedor !== req.vendedor.codigo) {
        await trx.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para editar este orçamento'
        });
      }

      // Calcular totais de desconto
      const { valorDesconto, valorTotal, valorComDesconto, valorIpi, valorSt } = calcularTotaisDesconto(itens);

      // Log para debug (adicionado)
      console.log('Valores de pagamento (update):', {
        form_pagto,
        cond_pagto,
        cod_vendedor
      });

      // Atualizar dados do orçamento - removendo os campos que não existem na tabela
      await trx('orcamentos')
        .where('codigo', id)
        .update({
          dt_orcamento: dt_orcamento || orcamentoExistente.dt_orcamento,
          cod_cliente: cod_cliente || orcamentoExistente.cod_cliente,
          cod_vendedor: cod_vendedor || orcamentoExistente.cod_vendedor,
          cod_transportadora,
          nome_transportadora,
          observacoes,
          // Usar os nomes corretos dos campos no banco de dados
          cod_forma_pagto: form_pagto,
          cod_cond_pagto: cond_pagto,
          vl_desconto: arredondar(valorDesconto, 2),
          vl_produtos: arredondar(valorTotal, 2),
          vl_com_desconto: arredondar(valorComDesconto, 2),
          vl_ipi: arredondar(valorIpi, 2),
          vl_st: arredondar(valorSt, 2),
          vl_total: arredondar(arredondar(valorComDesconto, 2) + arredondar(valorIpi, 2) + arredondar(valorSt, 2), 2), // Calcular valor total somando impostos
          dt_alt: new Date()
        });

      // Log para debug
      console.log('Orçamento atualizado com código:', id);
      console.log('Itens recebidos para atualização:', itens);
      console.log('Totais calculados:', { valorDesconto, valorTotal, valorComDesconto, valorIpi, valorSt });
      console.log('Campos de pagamento atualizados:', {
        form_pagto_recebido: form_pagto,
        cod_forma_pagto_salvo: form_pagto,
        cond_pagto_recebido: cond_pagto,
        cod_cond_pagto_salvo: cond_pagto
      });

      // Remover itens existentes
      await trx('orcamentos_itens')
        .where('orcamento_codigo', id)
        .del();

      // Inserir novos itens
      if (itens.length > 0) {
        const itensProcessados = await Promise.all(itens.map(async (item) => {
          // Obter dados fiscais do produto
          let dadosFiscais = null;
          try {
            dadosFiscais = await fiscalRulesService.getDadosFiscaisProduto(item.produto_codigo);
            console.log(`Dados fiscais recuperados para produto ${item.produto_codigo}:`, dadosFiscais);
          } catch (error) {
            console.error(`Erro ao buscar dados fiscais do produto ${item.produto_codigo}:`, error);
          }
          
          // Garantir que os valores sejam numéricos
          const quantidade = parseFloat(item.quantidade) || 0;
          const valorUnitario = parseFloat(item.valor_unitario) || 0;
          
          // CORREÇÃO: Usar valores já calculados no frontend seguindo a lógica do ERP
          const valorBruto = parseFloat(item.valor_bruto) || (quantidade * valorUnitario);
          const desconto = parseFloat(item.desconto || 0);
          const valorDesconto = parseFloat(item.valor_desconto) || ((valorBruto * desconto) / 100);
          const valorLiquido = parseFloat(item.valor_liquido) || (valorBruto - valorDesconto);
          const valorComDesconto = parseFloat(item.valor_com_desconto) || valorLiquido;
          
          // CORREÇÃO: Usar valores de tributos já calculados e salvos no banco
          const aliqIcms = parseFloat(item.aliq_icms) || parseFloat(dadosFiscais?.aliq_icms || 0);
          const aliqIpi = parseFloat(item.aliq_ipi) || parseFloat(dadosFiscais?.aliq_ipi || 0);
          const valorIcms = parseFloat(item.valor_icms) || 0;
          const valorIpi = parseFloat(item.valor_ipi) || 0;
          const valorIcmsSt = parseFloat(item.valor_icms_st) || 0;
          
          console.log(`⚠️ BACKEND - Processando item ${item.produto_codigo}:`, {
            valoresRecebidosDoFrontend: {
              valor_bruto: item.valor_bruto,
              valor_desconto: item.valor_desconto,
              valor_liquido: item.valor_liquido,
              valor_ipi: item.valor_ipi,
              aliq_ipi: item.aliq_ipi
            },
            valoresProcessados: {
              valorBruto,
              valorDesconto,
              valorLiquido,
              valorIpi,
              aliqIpi
            },
            valoresArredondados: {
              valor_bruto: arredondar(valorBruto, 2),
              valor_desconto: arredondar(valorDesconto, 2),
              valor_liquido: arredondar(valorLiquido, 2),
              valor_ipi: arredondar(valorIpi, 2),
              valor_total: arredondar(arredondar(valorLiquido, 2) + arredondar(valorIpi, 2) + arredondar(valorIcmsSt, 2), 2)
            }
          });
          
          return {
            codigo: item.codigo || uuidv4(),
            orcamento_codigo: id,
            produto_codigo: item.produto_codigo,
            quantidade,
            valor_unitario: arredondar(valorUnitario, 2),
            valor_bruto: arredondar(valorBruto, 2),
            valor_desconto: arredondar(valorDesconto, 2),
            valor_liquido: arredondar(valorLiquido, 2),
            valor_com_desconto: valorComDesconto.toFixed(2),
            valor_total: arredondar(arredondar(valorComDesconto, 2) + arredondar(valorIpi, 2) + arredondar(valorIcmsSt, 2), 2),
            // Campos fiscais
            desconto: arredondar(desconto, 2),
            st_icms: dadosFiscais?.st_icms || '00',
            aliq_icms: arredondar(aliqIcms, 2),
            valor_icms: arredondar(valorIcms, 2),
            icms_st: valorIcmsSt > 0 ? 'S' : 'N',
            valor_icms_st: arredondar(valorIcmsSt, 2),
            ipi: arredondar(aliqIpi, 2),
            valor_ipi: arredondar(valorIpi, 2),
            class_fiscal: dadosFiscais?.class_fiscal || '',
            ncm: dadosFiscais?.ncm || '',
            cod_origem_prod: dadosFiscais?.cod_origem_prod || '0',
            cod_status: 1,
            dt_inc: new Date(),
            // Adicionar campos de unidade
            unidade: item.unidade || '',
            is_unidade2: item.is_unidade2 === true ? true : false
          };
        }));

        await trx('orcamentos_itens').insert(itensProcessados);
      }

      // Commit da transação
      await trx.commit();

      return res.json({ 
        success: true, 
        message: 'Orçamento atualizado com sucesso' 
      });
    } catch (error) {
      // Rollback em caso de erro
      await trx.rollback();
      console.error('Erro ao atualizar orçamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  async delete(req, res) {
    const { id } = req.params;

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de excluir orçamentos'
        });
      }

      // Verificar se o orçamento existe
      const orcamento = await db('orcamentos')
        .where('codigo', id)
        .first();

      if (!orcamento) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamento.cod_vendedor !== req.vendedor.codigo) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para excluir este orçamento'
        });
      }

      // Excluir itens do orçamento primeiro (devido à restrição de chave estrangeira)
      await db('orcamentos_itens')
        .where('orcamento_codigo', id)
        .del();

      // Excluir o orçamento
      await db('orcamentos')
        .where('codigo', id)
        .del();

      return res.json({
        success: true,
        message: 'Orçamento excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async duplicate(req, res) {
    const { id } = req.params;
    const trx = await db.transaction();

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        await trx.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de duplicar orçamentos'
        });
      }

      // Buscar orçamento original
      const orcamentoOriginal = await trx('orcamentos')
        .where('codigo', id)
        .first();

      if (!orcamentoOriginal) {
        await trx.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Orçamento não encontrado' 
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamentoOriginal.cod_vendedor !== req.vendedor.codigo) {
        await trx.rollback();
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para duplicar este orçamento'
        });
      }

      // Buscar itens do orçamento original
      const itensOriginais = await trx('orcamentos_itens')
        .where('orcamento_codigo', id);

      // Gerar novo código para o orçamento duplicado
      const novoCodigo = uuidv4();

      // Criar novo orçamento baseado no original
      const novoOrcamento = {
        codigo: novoCodigo,
        dt_orcamento: new Date(), // Nova data
        dt_inc: new Date(),
        cod_cliente: orcamentoOriginal.cod_cliente,
        cod_vendedor: orcamentoOriginal.cod_vendedor,
        cod_transportadora: orcamentoOriginal.cod_transportadora,
        nome_transportadora: orcamentoOriginal.nome_transportadora,
        cod_empresa: orcamentoOriginal.cod_empresa,
        observacoes: `[CÓPIA] ${orcamentoOriginal.observacoes || ''}`,
        cod_forma_pagto: orcamentoOriginal.cod_forma_pagto,
        cod_cond_pagto: orcamentoOriginal.cod_cond_pagto,
        vl_desconto: orcamentoOriginal.vl_desconto,
        vl_produtos: orcamentoOriginal.vl_produtos,
        vl_com_desconto: orcamentoOriginal.vl_com_desconto,
        vl_ipi: orcamentoOriginal.vl_ipi,
        vl_st: orcamentoOriginal.vl_st,
        vl_total: orcamentoOriginal.vl_total,
        cod_status: 1 // Status inicial
      };

      // Inserir novo orçamento
      await trx('orcamentos').insert(novoOrcamento);

      // Duplicar itens do orçamento
      if (itensOriginais.length > 0) {
        const novosItens = itensOriginais.map(item => ({
          codigo: uuidv4(),
          orcamento_codigo: novoCodigo,
          produto_codigo: item.produto_codigo,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_bruto: item.valor_bruto,
          valor_desconto: item.valor_desconto,
          valor_liquido: item.valor_liquido,
          valor_com_desconto: item.valor_com_desconto,
          valor_total: item.valor_total,
          desconto: item.desconto,
          st_icms: item.st_icms,
          aliq_icms: item.aliq_icms,
          valor_icms: item.valor_icms,
          icms_st: item.icms_st,
          valor_icms_st: item.valor_icms_st,
          ipi: item.ipi,
          valor_ipi: item.valor_ipi,
          class_fiscal: item.class_fiscal,
          ncm: item.ncm,
          cod_origem_prod: item.cod_origem_prod,
          cod_status: 1,
          dt_inc: new Date(),
          unidade: item.unidade,
          is_unidade2: item.is_unidade2
        }));

        await trx('orcamentos_itens').insert(novosItens);
      }

      // Commit da transação
      await trx.commit();

      return res.status(201).json({ 
        success: true, 
        codigo: novoCodigo,
        message: 'Orçamento duplicado com sucesso' 
      });
    } catch (error) {
      // Rollback em caso de erro
      await trx.rollback();
      console.error('Erro ao duplicar orçamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // Método para aprovar um orçamento
  async approve(req, res) {
    const { id } = req.params;

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de aprovar orçamentos'
        });
      }

      // Verificar se o orçamento existe
      const orcamento = await db('orcamentos')
        .where('codigo', id)
        .first();

      if (!orcamento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Orçamento não encontrado' 
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamento.cod_vendedor !== req.vendedor.codigo) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para aprovar este orçamento'
        });
      }

      // Verificar se o orçamento já está convertido
      if (orcamento.status === 'CONVERTIDO') {
        return res.status(400).json({ 
          success: false, 
          message: 'Não é possível aprovar um orçamento já convertido em pedido' 
        });
      }

      // Atualizar o status do orçamento para 'APROVADO'
      await db('orcamentos')
        .where('codigo', id)
        .update({
          status: 'APROVADO',
          data_aprovacao: new Date()
        });

      return res.json({ 
        success: true, 
        message: 'Orçamento aprovado com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // Método para padronizar status dos orçamentos
  async padronizarStatus() {
    try {
      // Verificar orçamentos sem status definido e definir como 'PENDENTE'
      await db('orcamentos')
        .whereNull('status')
        .update({
          status: 'PENDENTE'
        });
        
      // Verificar orçamentos com cod_status específicos e atualizar o status textual
      const orcamentosParaAtualizar = await db('orcamentos')
        .whereNotNull('cod_status')
        .whereNull('status')
        .select('codigo', 'cod_status');
        
      for (const orc of orcamentosParaAtualizar) {
        let status = 'PENDENTE';
        
        // Mapear cod_status para status textual
        if (orc.cod_status === 2) {
          status = 'CONVERTIDO';
        } else if (orc.cod_status === 3) {
          status = 'APROVADO';
        } else if (orc.cod_status === 0) {
          status = 'CANCELADO';
        }
        
        await db('orcamentos')
          .where('codigo', orc.codigo)
          .update({ status });
      }
      
      console.log('Status dos orçamentos padronizados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao padronizar status dos orçamentos:', error);
      return false;
    }
  },

  // Handlers para cálculos de impostos
  async handleIcmsStChange(index, value, values, setFieldValue) {
    try {
      console.log(`handleIcmsStChange - Valor recebido: ${value}, tipo: ${typeof value}`);
      
      // Garantir que o valor seja um número, mesmo que seja zero
      const valorNumerico = value !== null && value !== undefined ? parseFloat(value) : 0;
      console.log(`handleIcmsStChange - Valor após conversão: ${valorNumerico}`);
      
      // Calculamos manualmente o valor do ICMS-ST baseado no valor inserido pelo usuário
      const item = values.itens[index];
      const valorIcmsSt = (valorNumerico / 100) * item.quantidade * item.valor_unitario;
      
      // Retornar o valor calculado
      return valorIcmsSt;
    } catch (error) {
      console.error('Erro ao calcular ICMS-ST:', error);
      return 0;
    }
  },
  
  async handleIpiChange(index, value, values, setFieldValue) {
    try {
      console.log(`handleIpiChange - Valor recebido: ${value}, tipo: ${typeof value}`);
      
      // Garantir que o valor seja um número, mesmo que seja zero
      const valorNumerico = value !== null && value !== undefined ? parseFloat(value) : 0;
      console.log(`handleIpiChange - Valor após conversão: ${valorNumerico}`);
      
      // Calculamos manualmente o valor do IPI baseado no valor inserido pelo usuário
      const item = values.itens[index];
      const valorIpi = (valorNumerico / 100) * item.quantidade * item.valor_unitario;
      
      // Retornar o valor calculado
      return valorIpi;
    } catch (error) {
      console.error('Erro ao calcular IPI:', error);
      return 0;
    }
  },

  // Método para gerar PDF do orçamento
  async generatePdf(req, res) {
    const { id } = req.params;

    try {
      // Verificar se o usuário tem um vendedor vinculado
      if (!req.vendedor && req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Você precisa vincular um token de vendedor ao seu usuário antes de gerar PDFs de orçamentos'
        });
      }
      
      // Buscar orçamento com todos os detalhes necessários
      const orcamento = await db('orcamentos')
        .where('orcamentos.codigo', id)
        .leftJoin('clientes', 'orcamentos.cod_cliente', 'clientes.codigo')
        .leftJoin('vendedores', 'orcamentos.cod_vendedor', 'vendedores.codigo')
        .leftJoin('formas_pagto', 'orcamentos.cod_forma_pagto', 'formas_pagto.codigo')
        .leftJoin('cond_pagto', 'orcamentos.cod_cond_pagto', 'cond_pagto.codigo')
        .select(
          'orcamentos.*',
          'clientes.nome as cliente_nome',
          'clientes.razao as cliente_razao',
          'clientes.pessoa',
          'clientes.cnpj',
          'clientes.cpf',
          'clientes.insc_est',
          'clientes.rg',
          'clientes.logradouro as cliente_logradouro',
          'clientes.logradouro_num as cliente_logradouro_num',
          'clientes.bairro as cliente_bairro',
          'clientes.municipio as cliente_municipio',
          'clientes.uf as cliente_uf',
          'clientes.cep as cliente_cep',
          'clientes.complemento as cliente_complemento',
          'clientes.ddd_fone1',
          'clientes.fone1',
          'clientes.ddd_celular',
          'clientes.celular',
          'vendedores.nome as vendedor_nome',
          'vendedores.email as vendedor_email',
          'formas_pagto.descricao as forma_pagto_descricao',
          'cond_pagto.descricao as cond_pagto_descricao'
        )
        .first();

      if (!orcamento) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      // Se não for admin, verificar se o orçamento pertence ao vendedor vinculado ao usuário
      if (req.userRole !== 'admin' && req.vendedor && orcamento.cod_vendedor !== req.vendedor.codigo) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para gerar PDF deste orçamento'
        });
      }

      // Buscar itens do orçamento
      const itens = await db('orcamentos_itens')
        .where('orcamento_codigo', id)
        .leftJoin('produtos', function() {
          this.on('produtos.codigo', '=', 'orcamentos_itens.produto_codigo')
              .andOn('produtos.cod_empresa', '=', db.raw('1'));
        })
        .select(
          'orcamentos_itens.codigo',
          'orcamentos_itens.orcamento_codigo',
          'orcamentos_itens.produto_codigo',
          'orcamentos_itens.quantidade',
          'orcamentos_itens.valor_unitario',
          'orcamentos_itens.valor_bruto',
          'orcamentos_itens.valor_desconto',
          'orcamentos_itens.valor_liquido',
          'orcamentos_itens.valor_com_desconto',
          'orcamentos_itens.valor_total',
          'orcamentos_itens.desconto',
          'orcamentos_itens.st_icms',
          'orcamentos_itens.valor_icms_st',
          'orcamentos_itens.aliq_icms',
          'orcamentos_itens.valor_icms',
          'orcamentos_itens.aliq_ipi',
          'orcamentos_itens.valor_ipi',
          db.raw('COALESCE(produtos.nome, produtos.descricao, CONCAT(\'Produto \', orcamentos_itens.produto_codigo)) as produto_descricao'),
          'produtos.unidade',
          'orcamentos_itens.unidade as item_unidade',
          'orcamentos_itens.is_unidade2'
        );

      // Processar itens com cálculos
      const itensProcessados = itens.map(item => {
        const quantidade = parseFloat(item.quantidade) || 0;
        const valorUnitario = parseFloat(item.valor_unitario) || 0;
        const valorBruto = quantidade * valorUnitario;
        const desconto = parseFloat(item.desconto) || 0;
        const valorDesconto = (valorBruto * desconto) / 100;
        const valorLiquido = valorBruto - valorDesconto;
        const valorIpi = parseFloat(item.valor_ipi) || 0;
        const valorIcmsSt = parseFloat(item.valor_icms_st) || 0;
        const valorTotal = valorLiquido + valorIpi + valorIcmsSt;

        return {
          ...item,
          valor_bruto: valorBruto,
          valor_desconto: valorDesconto,
          valor_liquido: valorLiquido,
          valor_total: valorTotal,
          tem_st: item.st_icms === 'S',
          // Usar a unidade do item se disponível, ou a unidade do produto como fallback
          unidade: item.item_unidade || item.unidade,
          isUnidade2: item.is_unidade2
        };
      });

      // Calcular totais
      const totais = itensProcessados.reduce((acc, item) => {
        acc.valor_produtos += parseFloat(item.valor_bruto) || 0;
        acc.valor_descontos += parseFloat(item.valor_desconto) || 0;
        acc.valor_liquido += parseFloat(item.valor_com_desconto) || 0;
        acc.valor_ipi += parseFloat(item.valor_ipi) || 0;
        acc.valor_st += parseFloat(item.valor_icms_st) || 0;
        acc.valor_total += parseFloat(item.valor_com_desconto) || 0;
        return acc;
      }, {
        valor_produtos: 0,
        valor_descontos: 0,
        valor_liquido: 0,
        valor_ipi: 0,
        valor_st: 0,
        valor_total: 0
      });

      // Montar objeto completo para o PDF
      const dadosCompletos = {
        orcamento: {
          ...orcamento,
          itens: itensProcessados,
          totais
        },
        cliente: {
          nome: orcamento.cliente_nome || orcamento.cliente_razao,
          pessoa: orcamento.pessoa,
          documento: orcamento.pessoa === 'J' ? orcamento.cnpj : orcamento.cpf,
          inscricao: orcamento.pessoa === 'J' ? orcamento.insc_est : orcamento.rg,
          endereco: {
            logradouro: orcamento.cliente_logradouro,
            numero: orcamento.cliente_logradouro_num,
            complemento: orcamento.cliente_complemento,
            bairro: orcamento.cliente_bairro,
            cidade: orcamento.cliente_municipio,
            uf: orcamento.cliente_uf,
            cep: orcamento.cliente_cep
          },
          contato: {
            telefone: orcamento.fone1 ? `(${orcamento.ddd_fone1}) ${orcamento.fone1}` : null,
            celular: orcamento.celular ? `(${orcamento.ddd_celular}) ${orcamento.celular}` : null
          }
        },
        vendedor: {
          nome: orcamento.vendedor_nome,
          email: orcamento.vendedor_email
        },
        pagamento: {
          forma: orcamento.forma_pagto_descricao,
          condicao: orcamento.cond_pagto_descricao
        }
      };

      return res.json({
        success: true,
        data: dadosCompletos
      });
    } catch (error) {
      console.error('Erro ao gerar PDF do orçamento:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}; 