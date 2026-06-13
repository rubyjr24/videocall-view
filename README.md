# 🚀 Callio (Angular 21 + Node.js 25)

Breve descripción del proyecto: qué hace, cuál es su propósito principal y qué tecnología utiliza (Angular 21, Node.js 25, TypeScript).

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

* **Node.js v25.x**: Puedes verificar tu versión ejecutando `node -v` en tu terminal. Se recomienda usar nvm (Node Version Manager).
* **Angular CLI**: Instálalo globalmente ejecutando: `npm install -g @angular/cli`.
* **Editor de código**: [Visual Studio Code](https://code.visualstudio.com/) es el recomendado para este stack.

---

## ⚙️ Configuración del Entorno (Node.js 25)

Para asegurar que estás usando la versión correcta de Node.js en tu entorno de desarrollo:

1. **Instalación de Node.js**: Descarga la versión 25 desde el [sitio oficial](https://nodejs.org/) o utiliza tu gestor de versiones (ej: `nvm install 25`).
2. **Seleccionar versión**: Asegúrate de estar usándola: `nvm use 25`.
3. **Verificación en VS Code**:
    * Abre tu proyecto en VS Code.
    * Abre la terminal integrada y ejecuta `node -v`.
    * Asegúrate de que el editor esté configurado para reconocer el SDK de Node en las configuraciones del proyecto si utilizas extensiones de depuración.

---

## 📦 Instalación de Dependencias y Ejecución

Para poner en marcha la aplicación, sigue estos pasos desde la raíz del proyecto:

### 1. Instalación de dependencias
El proyecto utiliza npm como gestor de paquetes. Ejecuta:

```bash
npm install
```

### 2. Ejecución

```bash
npm start -- --host 0.0.0.0 --ssl true --ssl-key ./key.pem --ssl-cert ./cert.pem
```
