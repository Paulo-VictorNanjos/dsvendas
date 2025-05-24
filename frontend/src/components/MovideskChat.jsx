import React, { useEffect } from 'react';

const MovideskChat = () => {
  useEffect(() => {
    // Criar e adicionar o script do Movidesk diretamente no head
    const head = document.head || document.getElementsByTagName('head')[0];
    
    // Script de configuração
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.id = 'movidesk-config';
    configScript.text = 'var mdChatClient="9F17B870F7624F6395F72BFD114FA480";';
    head.appendChild(configScript);

    // Script principal do chat
    const chatScript = document.createElement('script');
    chatScript.type = 'text/javascript';
    chatScript.id = 'movidesk-chat';
    chatScript.src = 'https://chat.movidesk.com/Scripts/chat-widget.min.js';
    chatScript.async = true;
    head.appendChild(chatScript);

    // Função para posicionar o chat à esquerda
    const positionChat = () => {
      const chatInterval = setInterval(() => {
        const chatWidget = document.querySelector('.md-chat-widget');
        if (chatWidget) {
          chatWidget.style.left = '20px';
          chatWidget.style.right = 'auto';
          clearInterval(chatInterval);
        }
      }, 500);

      // Limpar o intervalo após 20 segundos
      setTimeout(() => clearInterval(chatInterval), 20000);
    };

    // Tentar posicionar o chat quando o script carregar
    chatScript.onload = positionChat;

    // Cleanup function
    return () => {
      const configToRemove = document.getElementById('movidesk-config');
      const chatToRemove = document.getElementById('movidesk-chat');
      
      if (configToRemove) configToRemove.remove();
      if (chatToRemove) chatToRemove.remove();
    };
  }, []);

  return null;
};

export default MovideskChat; 