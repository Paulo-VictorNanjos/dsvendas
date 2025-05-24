import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import itemService from '../services/itemService';
import DuplicateItemModal from './DuplicateItemModal';

/**
 * Componente de exemplo para adicionar itens com validação de duplicados
 * @param {Object} props - Propriedades do componente
 * @param {number} props.documentId - ID do documento (pedido ou orçamento)
 * @param {string} props.documentType - Tipo de documento ('pedido' ou 'orcamento')
 * @param {Function} props.onItemAdded - Callback quando um item é adicionado com sucesso
 * @returns {JSX.Element} - Componente React
 */
const AddItemExample = ({ documentId, documentType, onItemAdded }) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para o modal de itens duplicados
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState(null);
  const [newItem, setNewItem] = useState(null);

  /**
   * Adiciona um item ao documento
   * @param {Event} e - Evento do formulário
   */
  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Preparar dados do item
      const itemData = {
        [documentType === 'pedido' ? 'id_pedido' : 'id_orcamento']: documentId,
        id_produto: productId,
        quantidade: quantity,
        valor_unitario: unitValue,
        // Outros campos necessários...
      };

      // Chamar API para adicionar item
      const result = await itemService.addItem(itemData, documentType);

      // Verificar se encontrou um item duplicado
      if (result.duplicateFound) {
        // Mostrar modal de confirmação
        setDuplicateItem(result.duplicateItem);
        setNewItem(result.newItem);
        setShowDuplicateModal(true);
      } else if (result.success) {
        // Item adicionado com sucesso
        setSuccess('Item adicionado com sucesso!');
        resetForm();
        
        // Notificar componente pai
        if (onItemAdded) {
          onItemAdded(result.item);
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao adicionar item');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resolve conflito somando as quantidades
   */
  const handleMergeItems = async () => {
    setLoading(true);
    try {
      const result = await itemService.resolveDuplicateItem({
        action: 'merge',
        duplicateItem,
        newItem
      }, documentType);

      if (result.success) {
        setSuccess('Quantidades somadas com sucesso!');
        resetForm();
        setShowDuplicateModal(false);
        
        // Notificar componente pai
        if (onItemAdded) {
          onItemAdded(result.item);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao somar quantidades');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resolve conflito adicionando como novo item
   */
  const handleAddNewItem = async () => {
    setLoading(true);
    try {
      const result = await itemService.resolveDuplicateItem({
        action: 'add',
        duplicateItem,
        newItem
      }, documentType);

      if (result.success) {
        setSuccess('Novo item adicionado com sucesso!');
        resetForm();
        setShowDuplicateModal(false);
        
        // Notificar componente pai
        if (onItemAdded) {
          onItemAdded(result.item);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao adicionar novo item');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reseta o formulário
   */
  const resetForm = () => {
    setProductId('');
    setQuantity(1);
    setUnitValue(0);
  };

  return (
    <>
      <Form onSubmit={handleAddItem}>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Form.Group className="mb-3">
          <Form.Label>Produto</Form.Label>
          <Form.Control
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Quantidade</Form.Label>
          <Form.Control
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Valor Unitário</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={unitValue}
            onChange={(e) => setUnitValue(Number(e.target.value))}
            required
          />
        </Form.Group>
        
        <Button 
          type="submit" 
          variant="primary" 
          disabled={loading}
        >
          {loading ? 'Adicionando...' : 'Adicionar Item'}
        </Button>
      </Form>
      
      {/* Modal de confirmação para itens duplicados */}
      <DuplicateItemModal
        show={showDuplicateModal}
        onHide={() => setShowDuplicateModal(false)}
        duplicateItem={duplicateItem}
        newItem={newItem}
        onMerge={handleMergeItems}
        onAddNew={handleAddNewItem}
      />
    </>
  );
};

export default AddItemExample; 