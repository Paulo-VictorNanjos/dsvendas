const erpConnection = require('../database/erpConnection');
const connection = require('../database/connection');
const logger = require('../utils/logger');

class PedidoController {
  // Verificar se as tabelas de workflow existem no ERP
  async verificarTabelasWorkflow(req, res) {
    try {
      logger.info('Verificando tabelas de workflow no ERP');
      
      const tabelas = [
        'status_workflow',
        'status_workflow_historico',
        'mob_pedidos_venda'
      ];
      
      const result = {};
      let todasExistem = true;
      
      for (const tabela of tabelas) {
        try {
          const existe = await erpConnection.schema.hasTable(tabela);
          result[tabela] = existe;
          
          if (!existe) {
            todasExistem = false;
          }
          
          if (existe) {
            // Contar registros para verificar se há dados
            const count = await erpConnection(tabela).count('* as total').first();
            result[`${tabela}_registros`] = count ? count.total : 0;
          }
        } catch (err) {
          logger.error(`Erro ao verificar tabela ${tabela}:`, err);
          result[tabela] = false;
          result[`${tabela}_erro`] = err.message;
          todasExistem = false;
        }
      }
      
      // Verificar se consegue acessar o banco de dados ERP
      try {
        const testQuery = await erpConnection.raw('SELECT 1 as conexao_ok');
        result['conexao_erp'] = testQuery && testQuery.length > 0;
      } catch (err) {
        logger.error('Erro ao testar conexão com ERP:', err);
        result['conexao_erp'] = false;
        result['conexao_erp_erro'] = err.message;
      }
      
      return res.json({
        todas_tabelas_existem: todasExistem,
        detalhes: result
      });
    } catch (error) {
      logger.error('Erro ao verificar tabelas de workflow:', error);
      return res.status(500).json({ 
        error: 'Erro ao verificar tabelas de workflow',
        message: error.message
      });
    }
  }
  
  // Listar todos os pedidos do vendedor com status de workflow
  async listarPedidosPorVendedor(req, res) {
    try {
      const { vendedor_id } = req.params;
      const page = parseInt(req.query.page) || 1; // Página atual, default 1
      const limit = parseInt(req.query.limit) || 5; // Limite por página, default 5
      const offset = (page - 1) * limit; // Cálculo do offset para paginação
      
      if (!vendedor_id) {
        logger.error('ID do vendedor não fornecido na requisição');
        return res.status(400).json({
          error: 'É necessário informar o ID do vendedor',
          message: 'Parâmetro vendedor_id não fornecido'
        });
      }
      
      logger.info(`Buscando pedidos para o vendedor ${vendedor_id} com informações de workflow (página ${page}, limite ${limit})`);
      
      // Verificar se o vendedor existe no ERP
      const vendedor = await erpConnection('vendedores')
        .where('codigo', vendedor_id)
        .first();
        
      if (!vendedor) {
        logger.warn(`Vendedor com ID ${vendedor_id} não encontrado no ERP`);
        // Continuar mesmo assim, pode ser um problema de sincronização
      } else {
        logger.info(`Vendedor ${vendedor_id} encontrado: ${vendedor.nome}`);
      }
      
      // Verificar quais tabelas realmente existem no banco
      const tabelas = {
        pedidos: false,
        mob_pedidos_venda: false,
        pedidos_venda: false,
        pedido_venda: false,
        pedidos_vendas: false,
        vendas: false,
        status_workflow: false
      };
      
      // Verificar a existência de todas as tabelas
      for (const tabela in tabelas) {
        try {
          tabelas[tabela] = await erpConnection.schema.hasTable(tabela);
          logger.info(`Verificação de tabela: ${tabela} - ${tabelas[tabela] ? 'existe' : 'não existe'}`);
        } catch (err) {
          logger.error(`Erro ao verificar existência da tabela ${tabela}:`, err);
        }
      }
      
      // Tentar encontrar uma tabela de pedidos disponível
      let tabelaPedidos = null;
      let campoCodigoVendedor = 'cod_vendedor';
      
      if (tabelas.pedidos_venda) {
        tabelaPedidos = 'pedidos_venda';
      } else if (tabelas.mob_pedidos_venda) {
        tabelaPedidos = 'mob_pedidos_venda';
      } else if (tabelas.pedidos) {
        tabelaPedidos = 'pedidos';
      } else if (tabelas.pedido_venda) {
        tabelaPedidos = 'pedido_venda';
      } else if (tabelas.vendas) {
        tabelaPedidos = 'vendas';
        campoCodigoVendedor = 'vendedor_codigo'; // Nome alternativo comum
      } else if (tabelas.pedidos_vendas) {
        tabelaPedidos = 'pedidos_vendas';
      }
      
      if (!tabelaPedidos) {
        logger.error('Nenhuma tabela de pedidos encontrada no banco de dados');
        return res.status(500).json({
          success: false,
          message: 'Erro ao localizar tabela de pedidos no banco de dados'
        });
      }
      
      logger.info(`Usando tabela de pedidos: ${tabelaPedidos}`);
      
      // Verificar se coluna de vendedor existe na tabela
      let colunasDisponiveis = [];
      try {
        // Obter lista de colunas disponíveis
        const colunas = await erpConnection(tabelaPedidos).columnInfo();
        colunasDisponiveis = Object.keys(colunas);
        logger.info(`Colunas disponíveis em ${tabelaPedidos}: ${colunasDisponiveis.join(', ')}`);
        
        // Verificar nome da coluna de vendedor
        if (!colunasDisponiveis.includes(campoCodigoVendedor)) {
          // Tentar alternativas comuns
          const alternativasCodVendedor = ['cod_vendedor', 'vendedor_codigo', 'vendedor_id', 'codigo_vendedor', 'id_vendedor'];
          
          for (const alternativa of alternativasCodVendedor) {
            if (colunasDisponiveis.includes(alternativa)) {
              campoCodigoVendedor = alternativa;
              logger.info(`Usando coluna alternativa para código do vendedor: ${campoCodigoVendedor}`);
              break;
            }
          }
        }
      } catch (err) {
        logger.error(`Erro ao obter informações das colunas da tabela ${tabelaPedidos}:`, err);
      }
      
      // Definir campos para selecionar
      const camposSelect = [
        `${tabelaPedidos}.codigo`,
        colunasDisponiveis.includes('dt_pedido') ? `${tabelaPedidos}.dt_pedido` : 'current_timestamp as dt_pedido',
        colunasDisponiveis.includes('cod_cliente') ? `${tabelaPedidos}.cod_cliente` : 'null as cod_cliente',
        colunasDisponiveis.includes('vl_produtos') ? `${tabelaPedidos}.vl_produtos` : '0 as vl_produtos',
        colunasDisponiveis.includes('vl_desconto') ? `${tabelaPedidos}.vl_desconto` : '0 as vl_desconto',
        colunasDisponiveis.includes('vl_total') ? `${tabelaPedidos}.vl_total` : '0 as vl_total',
        colunasDisponiveis.includes('cod_status_workflow') ? `${tabelaPedidos}.cod_status_workflow` : `${tabelaPedidos}.cod_status as cod_status_workflow`,
        'clientes.nome as cliente_nome',
        'status_workflow.descricao as status_workflow_descricao',
        'status_workflow.nome_etapa as status_workflow_etapa'
      ];
      
      // Criar uma query base para contar o total de registros
      let queryCount = erpConnection(tabelaPedidos);
      
      // Adicionar condição para o vendedor
      if (colunasDisponiveis.includes(campoCodigoVendedor)) {
        queryCount = queryCount.where(function() {
          this.where(`${tabelaPedidos}.${campoCodigoVendedor}`, String(vendedor_id));
          if (!isNaN(vendedor_id)) {
            this.orWhere(`${tabelaPedidos}.${campoCodigoVendedor}`, Number(vendedor_id));
          }
        });
      }
      
      // Executar a contagem total
      const totalCount = await queryCount.count('* as total').first();
      const total = parseInt(totalCount.total);
      
      // Criar uma query base para buscar os pedidos com paginação
      let query = erpConnection(tabelaPedidos).select(camposSelect);
      
      // Adicionar join com clientes se necessário
      if (colunasDisponiveis.includes('cod_cliente')) {
        query = query.leftJoin('clientes', `${tabelaPedidos}.cod_cliente`, 'clientes.codigo');
      }

      // Adicionar join com status_workflow
      query = query.leftJoin('status_workflow', function() {
        this.on(function() {
          this.on(`${tabelaPedidos}.cod_status_workflow`, '=', 'status_workflow.codigo')
            .orOn(`${tabelaPedidos}.cod_status`, '=', 'status_workflow.codigo');
        });
      });
      
      // Adicionar condição para o vendedor
      if (colunasDisponiveis.includes(campoCodigoVendedor)) {
        query = query.where(function() {
          this.where(`${tabelaPedidos}.${campoCodigoVendedor}`, String(vendedor_id));
          if (!isNaN(vendedor_id)) {
            this.orWhere(`${tabelaPedidos}.${campoCodigoVendedor}`, Number(vendedor_id));
          }
        });
      }
      
      // Ordenar por data se disponível
      if (colunasDisponiveis.includes('dt_pedido')) {
        query = query.orderBy(`${tabelaPedidos}.dt_pedido`, 'desc');
      } else if (colunasDisponiveis.includes('data')) {
        query = query.orderBy(`${tabelaPedidos}.data`, 'desc');
      } else if (colunasDisponiveis.includes('dt_inc')) {
        query = query.orderBy(`${tabelaPedidos}.dt_inc`, 'desc');
      }
      
      // Adicionar paginação
      query = query.limit(limit).offset(offset);
      
      // Executar a query
      try {
        const pedidos = await query;
        logger.info(`Encontrados ${pedidos.length} pedidos para o vendedor ${vendedor_id} na página ${page}`);
        
        // Para cada pedido, buscar o histórico de workflow
        const pedidosComHistorico = await Promise.all(pedidos.map(async (pedido) => {
          try {
            const historico = await erpConnection('status_workflow_historico')
              .select(
                'status_workflow_historico.*',
                'status_workflow.descricao as status_descricao',
                'status_workflow.nome_etapa as nome_etapa'
              )
              .leftJoin('status_workflow', 'status_workflow_historico.cod_status', 'status_workflow.codigo')
              .where('status_workflow_historico.cod_pedido', pedido.codigo)
              .orderBy('status_workflow_historico.dt_status', 'desc');

            return {
              ...pedido,
              historico_workflow: historico || []
            };
          } catch (historicoError) {
            logger.error(`Erro ao buscar histórico do pedido ${pedido.codigo}:`, historicoError);
            return {
              ...pedido,
              historico_workflow: []
            };
          }
        }));
        
        // Adaptar para o formato esperado pelo frontend
        const pedidosAdaptados = pedidosComHistorico.map(pedido => ({
          ...pedido,
          codigo: pedido.codigo || '',
          dt_pedido: pedido.dt_pedido || new Date(),
          cod_cliente: pedido.cod_cliente || '',
          vl_produtos: parseFloat(pedido.vl_produtos || 0),
          vl_desconto: parseFloat(pedido.vl_desconto || 0),
          vl_total: parseFloat(pedido.vl_total || 0),
          cod_status: pedido.cod_status || 1,
          cod_status_workflow: pedido.cod_status_workflow || pedido.cod_status || 1,
          status_workflow_descricao: pedido.status_workflow_descricao || 'Status padrão',
          status_workflow_etapa: pedido.status_workflow_etapa || 'Em processamento',
          historico_workflow: pedido.historico_workflow || []
        }));
        
        // Retornar com informações de paginação
        return res.json({
          pedidos: pedidosAdaptados,
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            perPage: limit,
            hasMore: offset + pedidos.length < total
          }
        });
      } catch (queryError) {
        logger.error(`Erro ao executar consulta de pedidos:`, queryError);
        
        // Em caso de falha, retornar array vazio mas com sucesso para não quebrar o frontend
        return res.json({
          pedidos: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: page,
            perPage: limit,
            hasMore: false
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao listar pedidos com workflow:', error);
      // Retornar array vazio em vez de erro para não quebrar a interface
      return res.json({
        pedidos: [],
        pagination: {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          perPage: limit,
          hasMore: false
        }
      });
    }
  }
  
  // Buscar detalhes de um pedido específico com seu workflow
  async buscarPedidoComWorkflow(req, res) {
    try {
      const { pedido_id } = req.params;
      
      if (!pedido_id) {
        logger.error('ID do pedido não fornecido na requisição');
        return res.status(400).json({
          error: 'É necessário informar o ID do pedido',
          message: 'Parâmetro pedido_id não fornecido'
        });
      }
      
      logger.info(`Buscando detalhes e workflow do pedido ${pedido_id}`);
      
      // Verificar quais tabelas realmente existem no banco
      const tabelas = {
        pedidos: false,
        mob_pedidos_venda: false,
        pedidos_venda: false,
        pedido_venda: false,
        pedidos_vendas: false,
        vendas: false,
        pedidos_itens: false,
        mob_pedidos_itens: false,
        itens_pedido: false,
        itens_pedidos_venda: false,
        status_workflow: false
      };
      
      // Verificar a existência de todas as tabelas
      for (const tabela in tabelas) {
        try {
          tabelas[tabela] = await erpConnection.schema.hasTable(tabela);
          logger.info(`Verificação de tabela: ${tabela} - ${tabelas[tabela] ? 'existe' : 'não existe'}`);
        } catch (err) {
          logger.error(`Erro ao verificar existência da tabela ${tabela}:`, err);
        }
      }
      
      // Encontrar a tabela de pedidos disponível
      let tabelaPedidos = null;
      
      if (tabelas.pedidos_venda) {
        tabelaPedidos = 'pedidos_venda';
      } else if (tabelas.mob_pedidos_venda) {
        tabelaPedidos = 'mob_pedidos_venda';
      } else if (tabelas.pedidos) {
        tabelaPedidos = 'pedidos';
      } else if (tabelas.pedido_venda) {
        tabelaPedidos = 'pedido_venda';
      } else if (tabelas.vendas) {
        tabelaPedidos = 'vendas';
      } else if (tabelas.pedidos_vendas) {
        tabelaPedidos = 'pedidos_vendas';
      }
      
      if (!tabelaPedidos) {
        logger.error('Nenhuma tabela de pedidos encontrada no banco de dados');
        return res.status(500).json({
          success: false,
          message: 'Erro ao localizar tabela de pedidos no banco de dados'
        });
      }
      
      // Encontrar a tabela de itens disponível
      let tabelaItens = null;
      let campoCodigoPedido = 'cod_pedido_venda';
      
      if (tabelas.mob_pedidos_itens) {
        tabelaItens = 'mob_pedidos_itens';
      } else if (tabelas.pedidos_itens) {
        tabelaItens = 'itens_pedidos_venda';
        campoCodigoPedido = 'cod_pedido_venda'; // Variação comum
      }
      
      logger.info(`Usando tabela de pedidos: ${tabelaPedidos}, tabela de itens: ${tabelaItens || 'não encontrada'}`);
      
      // Verificar colunas disponíveis na tabela de pedidos
      let colunasPedidos = [];
      try {
        const infoColunas = await erpConnection(tabelaPedidos).columnInfo();
        colunasPedidos = Object.keys(infoColunas);
        logger.info(`Colunas disponíveis em ${tabelaPedidos}: ${colunasPedidos.join(', ')}`);
      } catch (err) {
        logger.error(`Erro ao obter informações das colunas da tabela ${tabelaPedidos}:`, err);
        // Continuar mesmo com erro, usando lista vazia
      }
      
      // Buscar o pedido com uma query adaptativa
      let pedido = null;
      try {
        // Construir a query base
        let query = erpConnection(tabelaPedidos).select(`${tabelaPedidos}.*`);
        
        // Adicionar joins para tabelas relacionadas se as colunas existirem
        if (colunasPedidos.includes('cod_cliente')) {
          query = query.leftJoin('clientes', `${tabelaPedidos}.cod_cliente`, 'clientes.codigo')
                       .select('clientes.nome as cliente_nome');
        }
        
        if (colunasPedidos.includes('cod_vendedor')) {
          query = query.leftJoin('vendedores', `${tabelaPedidos}.cod_vendedor`, 'vendedores.codigo')
                       .select('vendedores.nome as vendedor_nome');
        }
        
        // Adicionar condição de busca adaptativa
        query = query.where(function() {
          // Tentar primeiro como string
          this.where(`${tabelaPedidos}.codigo`, pedido_id);
          
          // Tentar também como número
          if (!isNaN(pedido_id)) {
            this.orWhere(`${tabelaPedidos}.codigo`, Number(pedido_id));
          }
        }).first();
        
        pedido = await query;
        
        if (!pedido) {
          logger.warn(`Pedido ${pedido_id} não encontrado na tabela ${tabelaPedidos}`);
          return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        logger.info(`Pedido ${pedido_id} encontrado na tabela ${tabelaPedidos}`);
      } catch (queryError) {
        logger.error(`Erro ao buscar pedido ${pedido_id}:`, queryError);
        return res.status(500).json({ 
          error: 'Erro ao buscar pedido',
          message: queryError.message
        });
      }
      
      // Buscar itens se a tabela existir
      let itens = [];
      if (tabelaItens) {
        try {
          // Verificar colunas na tabela de itens
          let colunasItens = [];
          try {
            const infoColunasItens = await erpConnection(tabelaItens).columnInfo();
            colunasItens = Object.keys(infoColunasItens);
            logger.info(`Colunas disponíveis em ${tabelaItens}: ${colunasItens.join(', ')}`);
            
            // Verificar nome da coluna de código do pedido
            if (!colunasItens.includes(campoCodigoPedido)) {
              // Tentar alternativas comuns
              const alternativasCodPedido = ['pedido_codigo', 'codigo_pedido', 'cod_pedido_venda', 'pedido_id', 'id_pedido', 'num_pedido'];
              
              for (const alternativa of alternativasCodPedido) {
                if (colunasItens.includes(alternativa)) {
                  campoCodigoPedido = alternativa;
                  logger.info(`Usando coluna alternativa para código do pedido: ${campoCodigoPedido}`);
                  break;
                }
              }
            }
          } catch (err) {
            logger.error(`Erro ao obter informações das colunas da tabela ${tabelaItens}:`, err);
          }
          
          // Construir query para buscar itens
          let queryItens = erpConnection(tabelaItens).select(`${tabelaItens}.*`);
          
          // Adicionar join com produtos se possível
          const colunaProduto = colunasItens.find(col => ['produto_codigo', 'cod_produto', 'codigo_produto'].includes(col));
          if (colunaProduto) {
            queryItens = queryItens.leftJoin('produtos', `${tabelaItens}.${colunaProduto}`, 'produtos.codigo')
                                  .select('produtos.descricao as produto_descricao');
          }
          
          // Adicionar condição de busca adaptativa
          queryItens = queryItens.where(function() {
            // Tentar como string
            this.where(`${tabelaItens}.${campoCodigoPedido}`, pedido.codigo);
            
            // Tentar também como número
            if (!isNaN(pedido.codigo)) {
              this.orWhere(`${tabelaItens}.${campoCodigoPedido}`, Number(pedido.codigo));
            }
          });
          
          itens = await queryItens;
          logger.info(`Encontrados ${itens.length} itens para o pedido ${pedido_id}`);
        } catch (itensError) {
          logger.error(`Erro ao buscar itens do pedido ${pedido_id}:`, itensError);
          // Continuar com lista vazia
        }
      }
      
      // Preparar resposta adaptada para o formato esperado pelo frontend
      // Adicionar campos de workflow mesmo que não existam
      pedido.cod_status_workflow = pedido.cod_status_workflow || pedido.cod_status || 1;
      pedido.status_workflow_descricao = pedido.status_workflow_descricao || 'Status padrão';
      pedido.status_workflow_etapa = pedido.status_workflow_etapa || 'Em processamento';
      
      // Criar status de workflow básicos para mostrar na timeline
      const statusWorkflow = [
        { codigo: 1, descricao: 'Pendente', nome_etapa: 'Aguardando processamento' },
        { codigo: 2, descricao: 'Em separação', nome_etapa: 'Pedido em separação' },
        { codigo: 3, descricao: 'Conferido', nome_etapa: 'Pedido Conferido' },
        { codigo: 4, descricao: 'Despachado', nome_etapa: 'Pedido Despachado' },
        { codigo: 5, descricao: 'Faturado', nome_etapa: 'Pedido Faturado' },
        { codigo: 6, descricao: 'Nota fiscal emitida', nome_etapa: 'Nota fiscal emitida' },
        { codigo: 7, descricao: 'Entregue', nome_etapa: 'Entregue' },
      ];
      
      // Retornar o resultado no formato esperado
      return res.json({
        pedido,
        itens,
        historico_workflow: [],
        status_workflow_disponiveis: statusWorkflow
      });
    } catch (error) {
      logger.error('Erro ao buscar pedido com workflow:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar pedido com workflow',
        message: error.message
      });
    }
  }
  
  // Listar todos os status de workflow disponíveis
  async listarStatusWorkflow(req, res) {
    try {
      logger.info('Buscando todos os status de workflow disponíveis');
      
      const statusWorkflow = await erpConnection('status_workflow')
        .select('*')
        .orderBy('seq', 'asc');
      
      logger.info(`Encontrados ${statusWorkflow.length} status de workflow`);
      
      return res.json(statusWorkflow);
    } catch (error) {
      logger.error('Erro ao listar status de workflow:', error);
      return res.status(500).json({ 
        error: 'Erro ao listar status de workflow',
        message: error.message
      });
    }
  }
}

module.exports = new PedidoController(); 