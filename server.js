import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
// Importación de módulos que usan CommonJS (fcctesting.cjs y test-runner.cjs)
import * as fccTestingRoutes from './routes/fcctesting.cjs'; 
import * as runner from './test-runner.cjs'; 
import connectDB from './db.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// --- Configuraciones de Seguridad (HELMET) ---
// 2. Solo permitir que el sitio se cargue en un iFrame en tus propias páginas.
app.use(helmet.frameguard({ action: 'sameorigin' })); 
// 3. No permitir el prefetch de DNS.
app.use(helmet.dnsPrefetchControl({ allow: false })); 
// 4. Solo permitir que el sitio envíe el referrer para tus propias páginas.
app.use(helmet.referrerPolicy({ policy: 'same-origin' })); 
// Otras configuraciones de seguridad estándar
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));
app.use(helmet.xssFilter());
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
        runner.default.run(); 
      } catch (e) {
        let error = e;
        console.log('Tests are not set up:', error);
      }
    }, 1500);
  }
});

export default app;
