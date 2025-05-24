const fs = require('fs');
const path = require('path');

// Cria o diretório de logs se não existir
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Níveis de log com cores para console
const LOG_LEVELS = {
    INFO: '\x1b[36m[INFO]\x1b[0m',    // Ciano
    ERROR: '\x1b[31m[ERROR]\x1b[0m',  // Vermelho
    WARN: '\x1b[33m[WARN]\x1b[0m',    // Amarelo
    DEBUG: '\x1b[32m[DEBUG]\x1b[0m'   // Verde
};

class Logger {
    constructor() {
        // Cria um arquivo de log para cada execução
        const date = new Date();
        const timestamp = this.getFormattedTimestamp(date);
        this.logFile = path.join(logsDir, `sync_${this.getFormattedDate()}_${timestamp}.log`);
    }

    // Retorna a data atual formatada para o nome do arquivo
    getFormattedDate() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // Retorna o timestamp formatado para o nome do arquivo
    getFormattedTimestamp(date) {
        return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    }

    // Retorna o timestamp atual formatado para a linha de log
    getTimestamp() {
        const date = new Date();
        return date.toISOString().replace('T', ' ').replace('Z', '');
    }

    // Função genérica para escrever log
    async log(level, message, details = null) {
        const timestamp = this.getTimestamp();
        let logMessage = `[${timestamp}] ${level} ${message}`;
        
        // Adiciona detalhes se existirem
        if (details) {
            if (details instanceof Error) {
                logMessage += `\nStack: ${details.stack}`;
            } else {
                logMessage += `\nDetails: ${JSON.stringify(details, null, 2)}`;
            }
        }

        // Adiciona uma quebra de linha no final
        logMessage += '\n';

        try {
            // Escreve no arquivo
            await fs.promises.appendFile(this.logFile, logMessage);

            // Exibe no console com cores
            console.log(`${LOG_LEVELS[level]} ${message}`);
            if (details) {
                if (details instanceof Error) {
                    console.error(details.stack);
                } else {
                    console.log(details);
                }
            }
        } catch (error) {
            console.error('Erro ao salvar log:', error);
        }
    }

    // Métodos específicos para cada nível de log
    async info(message, details = null) {
        await this.log('INFO', message, details);
    }

    async error(message, error = null) {
        await this.log('ERROR', message, error);
    }

    async warn(message, details = null) {
        await this.log('WARN', message, details);
    }

    async debug(message, details = null) {
        if (process.env.NODE_ENV !== 'production') {
            await this.log('DEBUG', message, details);
        }
    }

    // Método para limpar logs antigos (mantém apenas os últimos X dias)
    async cleanOldLogs(daysToKeep = 7) {
        try {
            const files = await fs.promises.readdir(logsDir);
            const now = new Date();

            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = await fs.promises.stat(filePath);
                const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

                if (daysOld > daysToKeep) {
                    await fs.promises.unlink(filePath);
                    console.log(`${LOG_LEVELS.INFO} Log antigo removido: ${file}`);
                }
            }
        } catch (error) {
            console.error('Erro ao limpar logs antigos:', error);
        }
    }
}

// Exporta uma única instância do logger
module.exports = new Logger(); 