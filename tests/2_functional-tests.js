import chai, { assert, expect } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server.js';
import mongoose from 'mongoose';
import { Thread as ThreadModel } from '../models/Board.js'; // Importamos el modelo para limpiar

// Configurar chai-http
chai.use(chaiHttp);

// Variables para almacenar IDs generados durante las pruebas
let testThreadId;
let testReplyId;
const BOARD = 'testboard';
const INCORRECT_PASSWORD = 'wrong_password';
const CORRECT_PASSWORD = 'delete_me'; 

// Función para limpiar la base de datos antes de las pruebas
async function cleanDatabase(done) {
    if (mongoose.connection.readyState !== 1) {
        // Asegurarse de que la conexión esté abierta si es necesario
        // En este caso, confiamos en que server.js llama a connectDB
    }
    try {
        await ThreadModel.deleteMany({});
        // console.log("Database cleared.");
        done();
    } catch (err) {
        console.error("Error clearing database:", err);
        done(err);
    }
}

suite('Functional Tests', function() {

  this.timeout(5000); 

  // Limpiar la base de datos antes de todas las pruebas
  before(function(done) {
    cleanDatabase(done);
  });

  suite('API ROUTING FOR /api/threads/:board', function() {

    // --- 1. Crear un nuevo hilo (POST /api/threads/{board}) ---
    test('Creating a new thread', function(done) {
      chai.request(app)
        .post(`/api/threads/${BOARD}`)
        .send({
          text: 'Test thread for deletion and replies',
          delete_password: CORRECT_PASSWORD
        })
        .end(function(err, res) {
          // La API devuelve 'success' para pasar la prueba
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

    // --- 2. Ver los 10 hilos más recientes con 3 respuestas cada uno (GET /api/threads/{board}) ---
    test('Viewing the 10 most recent threads with 3 replies each', function(done) {
      chai.request(app)
        .get(`/api/threads/${BOARD}`)
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          
          if (res.body.length > 0) {
            const thread = res.body[0];
            testThreadId = thread._id; // Guardamos el ID del hilo para usarlo después
            
            assert.notProperty(thread, 'delete_password');
            assert.notProperty(thread, 'reported');
            assert.isAtMost(thread.replies.length, 3);
          }
          done();
        });
    });
    
    // --- 5. Reportar un hilo (PUT /api/threads/{board}) ---
    // EXPECTED: 'reported'
    test('Reporting a thread', function(done) {
        if (!testThreadId) {
            return done(new Error('testThreadId not set. Cannot run PUT test.'));
        }

        chai.request(app)
            .put(`/api/threads/${BOARD}`)
            .send({ thread_id: testThreadId })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'reported', 'Expected reported message'); // CORRECCIÓN
                done();
            });
    });

    // --- 3. Eliminar un hilo con contraseña incorrecta (DELETE /api/threads/{board}) ---
    test('Deleting a thread with the incorrect password', function(done) {
        if (!testThreadId) {
            return done(new Error('testThreadId not set. Cannot run DELETE incorrect password test.'));
        }

        chai.request(app)
            .delete(`/api/threads/${BOARD}`)
            .send({
                thread_id: testThreadId,
                delete_password: INCORRECT_PASSWORD
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'incorrect password');
                done();
            });
    });

    // --- 4. Eliminar un hilo con contraseña correcta (DELETE /api/threads/{board}) ---
    test('Deleting a thread with the correct password', function(done) {
        if (!testThreadId) {
            return done(new Error('testThreadId not set. Cannot run DELETE correct password test.'));
        }

        chai.request(app)
            .delete(`/api/threads/${BOARD}`)
            .send({
                thread_id: testThreadId,
                delete_password: CORRECT_PASSWORD
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'success');
                done();
            });
    });

  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    let threadWithRepliesId;

    // Crear un nuevo hilo para las pruebas de respuestas
    before(function(done) {
        chai.request(app)
            .post(`/api/threads/${BOARD}`)
            .send({
                text: 'Thread for reply tests',
                delete_password: CORRECT_PASSWORD
            })
            .end(function(err, res) {
                // Obtener el ID del hilo recién creado
                chai.request(app)
                    .get(`/api/threads/${BOARD}`)
                    .end(function(err, res) {
                        if (res.body.length > 0) {
                            threadWithRepliesId = res.body[0]._id;
                        }
                        done();
                    });
            });
    });

    // --- 6. Crear una nueva respuesta (POST /api/replies/{board}) ---
    test('Creating a new reply', function(done) {
      if (!threadWithRepliesId) {
        return done(new Error('threadWithRepliesId not set. Cannot run POST reply test.'));
      }
      
      chai.request(app)
        .post(`/api/replies/${BOARD}`)
        .send({
          thread_id: threadWithRepliesId,
          text: 'This is a test reply for deletion.',
          delete_password: CORRECT_PASSWORD
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

    // --- 7. Ver un solo hilo con todas las respuestas (GET /api/replies/{board}) ---
    test('Viewing a single thread with all replies', function(done) {
        if (!threadWithRepliesId) {
            return done(new Error('threadWithRepliesId not set. Cannot run GET replies test.'));
        }

        chai.request(app)
            .get(`/api/replies/${BOARD}?thread_id=${threadWithRepliesId}`)
            .end(function(err, res) {
                assert.equal(res.status, 200);
                const thread = res.body;

                if (thread.replies && thread.replies.length > 0) {
                    const lastReply = thread.replies.find(r => r.text === 'This is a test reply for deletion.');
                    if (lastReply) {
                        testReplyId = lastReply._id;
                    }
                    assert.notProperty(thread.replies[0], 'delete_password');
                }
                
                assert.notProperty(thread, 'delete_password');
                done();
            });
    });

    // --- 10. Reportar una respuesta (PUT /api/replies/{board}) ---
    // EXPECTED: 'reported'
    test('Reporting a reply', function(done) {
        if (!threadWithRepliesId || !testReplyId) {
            return done(new Error('IDs missing. Cannot run PUT reply test.'));
        }
        
        chai.request(app)
            .put(`/api/replies/${BOARD}`)
            .send({
                thread_id: threadWithRepliesId,
                reply_id: testReplyId
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'reported', 'Expected reported message'); // CORRECCIÓN
                done();
            });
    });

    // --- 8. Eliminar una respuesta con contraseña incorrecta (DELETE /api/replies/{board}) ---
    test('Deleting a reply with the incorrect password', function(done) {
        if (!threadWithRepliesId || !testReplyId) {
            return done(new Error('IDs missing. Cannot run DELETE incorrect password reply test.'));
        }
        
        chai.request(app)
            .delete(`/api/replies/${BOARD}`)
            .send({
                thread_id: threadWithRepliesId,
                reply_id: testReplyId,
                delete_password: INCORRECT_PASSWORD
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'incorrect password');
                done();
            });
    });

    // --- 9. Eliminar una respuesta con contraseña correcta (DELETE /api/replies/{board}) ---
    test('Deleting a reply with the correct password', function(done) {
        if (!threadWithRepliesId || !testReplyId) {
            return done(new Error('IDs missing. Cannot run DELETE correct password reply test.'));
        }
        
        chai.request(app)
            .delete(`/api/replies/${BOARD}`)
            .send({
                thread_id: threadWithRepliesId,
                reply_id: testReplyId,
                delete_password: CORRECT_PASSWORD
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'success');
                done();
            });
    });

  });
});
