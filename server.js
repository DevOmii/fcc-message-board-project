import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
// Importación de módulos que probablemente usan CommonJS
import * as fccTestingRoutes from './routes/fcctesting.cjs';
import * as runner from './test-runner.cjs';
import connectDB from './db.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// --- Configuraciones de Seguridad (Helmet) ---
// Configuración básica requerida por freeCodeCamp
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.noSniff());

app.use(cors({ origin: '*' })); // Permite que FCC use la API

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Archivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));

// Página de inicio
app.route('/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// Rutas de testing de freeCodeCamp
// Usamos .default() porque la importación completa (*) a menudo coloca la exportación de CommonJS bajo la clave 'default'
fccTestingRoutes.default(app);

// Rutas de API
apiRoutes(app);

// Manejo de errores 404
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Iniciar el servidor
const listener = app.listen(process.env.PORT || 3000, function() {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function() {
      try {
        // Ejecutar el runner de pruebas
        runner.default.run(); 
      } catch (e) {
        let error = e;
        console.log('Tests are not set up:', error);
      }
    }, 1500);
  }
});

export default app; // Exportamos la app para las pruebas