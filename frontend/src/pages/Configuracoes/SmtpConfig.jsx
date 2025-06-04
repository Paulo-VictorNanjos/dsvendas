import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaSave, FaTrash, FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../../services/api';

const SmtpConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_name: '',
    from_email: '',
    active: true
  });
  const [hasConfig, setHasConfig] = useState(false);

  // Carregar configuração existente
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/smtp/config');
      
      if (response.data.success && response.data.data) {
        setConfig(prev => ({
          ...prev,
          ...response.data.data,
          smtp_password: '' // Não carregar a senha por segurança
        }));
        setHasConfig(true);
        setHasExistingPassword(true); // Indica que há uma senha salva
      } else {
        setHasConfig(false);
        setHasExistingPassword(false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração SMTP:', error);
      toast.error('Erro ao carregar configuração SMTP');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Se está digitando uma nova senha, não temos mais a senha existente
    if (field === 'smtp_password' && value !== '') {
      setHasExistingPassword(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validar campos obrigatórios
      if (!config.smtp_host || !config.smtp_user || !config.from_name || !config.from_email) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Se não tem senha nova e não tem senha existente, é obrigatório
      if (!config.smtp_password && !hasExistingPassword) {
        toast.error('Senha é obrigatória');
        return;
      }

      setSaving(true);
      const configToSave = { ...config };
      
      // Se não digitou nova senha e tem senha existente, não enviar o campo senha
      if (!config.smtp_password && hasExistingPassword) {
        delete configToSave.smtp_password;
      }

      const response = await api.post('/smtp/config', configToSave);
      
      if (response.data.success) {
        toast.success('Configuração SMTP salva com sucesso!');
        setHasConfig(true);
        setHasExistingPassword(true);
        // Limpar apenas a senha do formulário por segurança
        setConfig(prev => ({ ...prev, smtp_password: '' }));
      } else {
        toast.error(response.data.message || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração SMTP:', error);
      toast.error('Erro ao salvar configuração SMTP');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      if (!config.smtp_host || !config.smtp_user) {
        toast.error('Preencha pelo menos Host e Usuário para testar');
        return;
      }

      // Se não tem senha digitada e não tem senha existente
      if (!config.smtp_password && !hasExistingPassword) {
        toast.error('Senha é necessária para testar a conexão');
        return;
      }

      setTesting(true);
      
      const testConfig = {
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_secure: config.smtp_secure,
        smtp_user: config.smtp_user,
        smtp_password: config.smtp_password || 'senha_existente_no_servidor'
      };

      const response = await api.post('/smtp/test', testConfig);
      
      if (response.data.success) {
        toast.success('Configuração SMTP válida! Conexão estabelecida com sucesso.');
      } else {
        toast.error(`Erro no teste: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Erro ao testar configuração SMTP:', error);
      toast.error('Erro ao testar configuração SMTP');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja remover suas configurações de e-mail?')) {
      return;
    }

    try {
      const response = await api.delete('/smtp/config');
      
      if (response.data.success) {
        toast.success('Configuração removida com sucesso!');
        setConfig({
          smtp_host: '',
          smtp_port: 587,
          smtp_secure: false,
          smtp_user: '',
          smtp_password: '',
          from_name: '',
          from_email: '',
          active: true
        });
        setHasConfig(false);
        setHasExistingPassword(false);
      } else {
        toast.error(response.data.message || 'Erro ao remover configuração');
      }
    } catch (error) {
      console.error('Erro ao remover configuração SMTP:', error);
      toast.error('Erro ao remover configuração SMTP');
    }
  };

  // Verificar se pode testar (tem os campos mínimos preenchidos)
  const canTest = config.smtp_host && config.smtp_user && (config.smtp_password || hasExistingPassword);

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Configurações de E-mail (SMTP)</h5>
        {hasConfig && (
          <Button variant="outline-danger" size="sm" onClick={handleDelete}>
            <FaTrash className="me-1" />
            Remover Configuração
          </Button>
        )}
      </div>

      <Alert variant="info" className="mb-4">
        <strong>Importante:</strong> Configure seu servidor SMTP para poder enviar orçamentos por e-mail. 
        Cada usuário pode ter sua própria configuração de e-mail.
      </Alert>

      <Form>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Servidor SMTP *</Form.Label>
              <Form.Control
                type="text"
                placeholder="smtp.gmail.com"
                value={config.smtp_host}
                onChange={(e) => handleInputChange('smtp_host', e.target.value)}
              />
              <Form.Text className="text-muted">
                Endereço do servidor de e-mail (ex: smtp.gmail.com, smtp.outlook.com)
              </Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Porta *</Form.Label>
              <Form.Control
                type="number"
                value={config.smtp_port}
                onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
              />
              <Form.Text className="text-muted">
                Geralmente 587 ou 465
              </Form.Text>
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>&nbsp;</Form.Label>
              <div>
                <Form.Check
                  type="switch"
                  id="smtp-secure"
                  label="Conexão Segura (SSL/TLS)"
                  checked={config.smtp_secure}
                  onChange={(e) => handleInputChange('smtp_secure', e.target.checked)}
                />
              </div>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Usuário/E-mail *</Form.Label>
              <Form.Control
                type="email"
                placeholder="seu-email@gmail.com"
                value={config.smtp_user}
                onChange={(e) => handleInputChange('smtp_user', e.target.value)}
              />
              <Form.Text className="text-muted">
                Seu e-mail para autenticação no servidor SMTP
              </Form.Text>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                Senha * 
                {hasExistingPassword && !config.smtp_password && (
                  <small className="text-success ms-2">(Senha salva)</small>
                )}
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder={hasExistingPassword ? "Digite nova senha ou deixe em branco para manter" : "Sua senha ou senha de app"}
                  value={config.smtp_password}
                  onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="position-absolute top-50 end-0 translate-middle-y me-2"
                  style={{ border: 'none', background: 'transparent' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
              <Form.Text className="text-muted">
                Para Gmail, use uma "senha de app" específica
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nome do Remetente *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Seu Nome ou Empresa"
                value={config.from_name}
                onChange={(e) => handleInputChange('from_name', e.target.value)}
              />
              <Form.Text className="text-muted">
                Nome que aparecerá como remetente dos e-mails
              </Form.Text>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>E-mail de Envio *</Form.Label>
              <Form.Control
                type="email"
                placeholder="nao-responda@empresa.com"
                value={config.from_email}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
              />
              <Form.Text className="text-muted">
                E-mail que aparecerá como remetente
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex gap-2 mt-4">
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Salvando...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Salvar Configuração
              </>
            )}
          </Button>

          <Button 
            variant="outline-primary" 
            onClick={handleTest}
            disabled={testing || !canTest}
          >
            {testing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Testando...
              </>
            ) : (
              <>
                <FaCheck className="me-2" />
                Testar Conexão
              </>
            )}
          </Button>
        </div>
      </Form>

      <Card className="mt-4">
        <Card.Header>
          <h6 className="mb-0">💡 Dicas de Configuração</h6>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Gmail:</h6>
              <ul className="small">
                <li>Servidor: smtp.gmail.com</li>
                <li>Porta: 587</li>
                <li>SSL/TLS: Ativado</li>
                <li>Use uma "senha de app" em vez da senha normal</li>
              </ul>
            </Col>
            <Col md={6}>
              <h6>Outlook/Hotmail:</h6>
              <ul className="small">
                <li>Servidor: smtp.live.com</li>
                <li>Porta: 587</li>
                <li>SSL/TLS: Ativado</li>
                <li>Use sua senha normal do Outlook</li>
              </ul>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SmtpConfig; 