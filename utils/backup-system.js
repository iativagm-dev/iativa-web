/**
 * Sistema de Backups Automáticos para Archivos JSON
 * Protege datos críticos con respaldos periódicos
 */

const fs = require('fs').promises;
const path = require('path');

class BackupSystem {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(__dirname, '../data');
        this.backupDir = options.backupDir || path.join(__dirname, '../backups/auto');
        this.maxBackups = options.maxBackups || 30; // Mantener últimos 30 backups
        this.backupInterval = options.backupInterval || 6 * 60 * 60 * 1000; // 6 horas por defecto
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Iniciar el sistema de backups automáticos
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️  Sistema de backups ya está en ejecución');
            return;
        }

        try {
            // Crear directorio de backups si no existe
            await this.ensureBackupDirectory();

            // Realizar backup inicial
            await this.createBackup();

            // Programar backups periódicos
            this.intervalId = setInterval(async () => {
                try {
                    await this.createBackup();
                    await this.cleanOldBackups();
                } catch (error) {
                    console.error('❌ Error en backup automático:', error.message);
                }
            }, this.backupInterval);

            this.isRunning = true;
            console.log(`✅ Sistema de backups iniciado (cada ${this.backupInterval / 1000 / 60} minutos)`);
        } catch (error) {
            console.error('❌ Error al iniciar sistema de backups:', error.message);
            throw error;
        }
    }

    /**
     * Detener el sistema de backups
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Sistema de backups detenido');
    }

    /**
     * Asegurar que existe el directorio de backups
     */
    async ensureBackupDirectory() {
        try {
            await fs.access(this.backupDir);
        } catch {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log(`📁 Directorio de backups creado: ${this.backupDir}`);
        }
    }

    /**
     * Crear un backup de todos los archivos JSON
     */
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupSubDir = path.join(this.backupDir, timestamp);

            await fs.mkdir(backupSubDir, { recursive: true });

            // Leer todos los archivos JSON del directorio de datos
            const files = await fs.readdir(this.dataDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            let backedUpCount = 0;

            for (const file of jsonFiles) {
                try {
                    const sourcePath = path.join(this.dataDir, file);
                    const destPath = path.join(backupSubDir, file);

                    // Copiar archivo
                    await fs.copyFile(sourcePath, destPath);
                    backedUpCount++;
                } catch (error) {
                    console.error(`⚠️  Error al respaldar ${file}:`, error.message);
                }
            }

            console.log(`💾 Backup completado: ${backedUpCount} archivos respaldados en ${timestamp}`);
            return { timestamp, filesBackedUp: backedUpCount };
        } catch (error) {
            console.error('❌ Error al crear backup:', error.message);
            throw error;
        }
    }

    /**
     * Limpiar backups antiguos (mantener solo los últimos N)
     */
    async cleanOldBackups() {
        try {
            const backups = await fs.readdir(this.backupDir);

            if (backups.length <= this.maxBackups) {
                return;
            }

            // Ordenar backups por fecha (más antiguos primero)
            backups.sort();

            // Eliminar los backups más antiguos
            const toDelete = backups.slice(0, backups.length - this.maxBackups);

            for (const backup of toDelete) {
                const backupPath = path.join(this.backupDir, backup);
                try {
                    const stats = await fs.stat(backupPath);
                    if (stats.isDirectory()) {
                        await this.deleteDirectory(backupPath);
                        console.log(`🗑️  Backup antiguo eliminado: ${backup}`);
                    }
                } catch (error) {
                    console.error(`⚠️  Error al eliminar backup ${backup}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error al limpiar backups antiguos:', error.message);
        }
    }

    /**
     * Eliminar un directorio recursivamente
     */
    async deleteDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory()) {
                    await this.deleteDirectory(filePath);
                } else {
                    await fs.unlink(filePath);
                }
            }

            await fs.rmdir(dirPath);
        } catch (error) {
            console.error(`Error al eliminar directorio ${dirPath}:`, error.message);
            throw error;
        }
    }

    /**
     * Restaurar desde un backup específico
     */
    async restoreBackup(timestamp) {
        try {
            const backupPath = path.join(this.backupDir, timestamp);

            // Verificar que existe el backup
            await fs.access(backupPath);

            const files = await fs.readdir(backupPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            let restoredCount = 0;

            for (const file of jsonFiles) {
                try {
                    const sourcePath = path.join(backupPath, file);
                    const destPath = path.join(this.dataDir, file);

                    // Crear backup del archivo actual antes de restaurar
                    try {
                        await fs.copyFile(destPath, `${destPath}.before-restore`);
                    } catch {
                        // El archivo puede no existir, está bien
                    }

                    // Restaurar archivo
                    await fs.copyFile(sourcePath, destPath);
                    restoredCount++;
                } catch (error) {
                    console.error(`⚠️  Error al restaurar ${file}:`, error.message);
                }
            }

            console.log(`✅ Restauración completada: ${restoredCount} archivos restaurados desde ${timestamp}`);
            return { timestamp, filesRestored: restoredCount };
        } catch (error) {
            console.error('❌ Error al restaurar backup:', error.message);
            throw error;
        }
    }

    /**
     * Listar todos los backups disponibles
     */
    async listBackups() {
        try {
            const backups = await fs.readdir(this.backupDir);
            const backupInfo = [];

            for (const backup of backups) {
                const backupPath = path.join(this.backupDir, backup);
                try {
                    const stats = await fs.stat(backupPath);
                    if (stats.isDirectory()) {
                        const files = await fs.readdir(backupPath);
                        backupInfo.push({
                            timestamp: backup,
                            date: stats.mtime,
                            filesCount: files.length,
                            size: await this.getDirectorySize(backupPath)
                        });
                    }
                } catch (error) {
                    console.error(`Error al leer info de backup ${backup}:`, error.message);
                }
            }

            return backupInfo.sort((a, b) => b.date - a.date);
        } catch (error) {
            console.error('❌ Error al listar backups:', error.message);
            return [];
        }
    }

    /**
     * Obtener tamaño de un directorio
     */
    async getDirectorySize(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            let totalSize = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory()) {
                    totalSize += await this.getDirectorySize(filePath);
                } else {
                    totalSize += stats.size;
                }
            }

            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Obtener estadísticas del sistema de backups
     */
    async getStats() {
        try {
            const backups = await this.listBackups();
            const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

            return {
                isRunning: this.isRunning,
                backupInterval: this.backupInterval,
                maxBackups: this.maxBackups,
                currentBackups: backups.length,
                totalSize: totalSize,
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].date : null,
                latestBackup: backups.length > 0 ? backups[0].date : null
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error.message);
            return null;
        }
    }
}

// Instancia singleton
let backupSystemInstance = null;

/**
 * Obtener instancia del sistema de backups
 */
function getBackupSystem(options) {
    if (!backupSystemInstance) {
        backupSystemInstance = new BackupSystem(options);
    }
    return backupSystemInstance;
}

module.exports = {
    BackupSystem,
    getBackupSystem
};