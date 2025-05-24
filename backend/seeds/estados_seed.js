/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('estados').del();
  
  // Insert all Brazilian states
  await knex('estados').insert([
    { uf: 'AC', nome: 'Acre', codigo_ibge: 12 },
    { uf: 'AL', nome: 'Alagoas', codigo_ibge: 27 },
    { uf: 'AP', nome: 'Amapá', codigo_ibge: 16 },
    { uf: 'AM', nome: 'Amazonas', codigo_ibge: 13 },
    { uf: 'BA', nome: 'Bahia', codigo_ibge: 29 },
    { uf: 'CE', nome: 'Ceará', codigo_ibge: 23 },
    { uf: 'DF', nome: 'Distrito Federal', codigo_ibge: 53 },
    { uf: 'ES', nome: 'Espírito Santo', codigo_ibge: 32 },
    { uf: 'GO', nome: 'Goiás', codigo_ibge: 52 },
    { uf: 'MA', nome: 'Maranhão', codigo_ibge: 21 },
    { uf: 'MT', nome: 'Mato Grosso', codigo_ibge: 51 },
    { uf: 'MS', nome: 'Mato Grosso do Sul', codigo_ibge: 50 },
    { uf: 'MG', nome: 'Minas Gerais', codigo_ibge: 31 },
    { uf: 'PA', nome: 'Pará', codigo_ibge: 15 },
    { uf: 'PB', nome: 'Paraíba', codigo_ibge: 25 },
    { uf: 'PR', nome: 'Paraná', codigo_ibge: 41 },
    { uf: 'PE', nome: 'Pernambuco', codigo_ibge: 26 },
    { uf: 'PI', nome: 'Piauí', codigo_ibge: 22 },
    { uf: 'RJ', nome: 'Rio de Janeiro', codigo_ibge: 33 },
    { uf: 'RN', nome: 'Rio Grande do Norte', codigo_ibge: 24 },
    { uf: 'RS', nome: 'Rio Grande do Sul', codigo_ibge: 43 },
    { uf: 'RO', nome: 'Rondônia', codigo_ibge: 11 },
    { uf: 'RR', nome: 'Roraima', codigo_ibge: 14 },
    { uf: 'SC', nome: 'Santa Catarina', codigo_ibge: 42 },
    { uf: 'SP', nome: 'São Paulo', codigo_ibge: 35 },
    { uf: 'SE', nome: 'Sergipe', codigo_ibge: 28 },
    { uf: 'TO', nome: 'Tocantins', codigo_ibge: 17 }
  ]);
};
