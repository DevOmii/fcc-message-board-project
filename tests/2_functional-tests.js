/*
*
*
* T E S T S
*
*/

import chai, { assert, expect } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server.js'; // Importamos la aplicación Express

// Configurar chai-http para hacer peticiones HTTP al servidor
chai.use(chaiHttp);

// Variables para almacenar IDs generados durante las pruebas
let testThreadId;
let testReplyId;
const BOARD = 'testboard';
const INCORRECT_PASSWORD = 'wrong_password';
const CORRECT_PASSWORD = 'delete_me'; // Usaremos esta contraseña para los hilos y respuestas

suite('Functional Tests', function() {

  this.timeout(5000); // Aumentar el tiempo de espera por si la base de datos es lenta

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
          // FCC espera una redirección, por lo que el estado puede ser 302 o 200 si la redirección falla.
          // Verificamos que se haya guardado y que el contenido de la página sea una redirección o éxito.
          assert.equal(res.status, 200, 'Expected status 200 for successful post/redirect');
          
          // Opcional: Podrías buscar el hilo recién creado para obtener el ID,
          // pero para simplificar, usaremos el GET de los 10 hilos en el siguiente test para obtener un ID.
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
          assert.isAtMost(res.body.length, 10);
          
          // Verificar la estructura de un hilo
          if (res.body.length > 0) {
            const thread = res.body[0];
            testThreadId = thread._id; // Guardamos el ID del hilo para usarlo en pruebas futuras
            
            assert.property(thread, '_id');
            assert.property(thread, 'text');
            assert.property(thread, 'created_on');
            assert.property(thread, 'bumped_on');
            assert.property(thread, 'replies');
            assert.property(thread, 'replycount');
            
            // Campos de seguridad deben faltar
            assert.notProperty(thread, 'delete_password');
            assert.notProperty(thread, 'reported');

            // Verificar límite de respuestas
            assert.isAtMost(thread.replies.length, 3, 'Replies array should have a maximum of 3 items');
            
            // Verificar estructura de respuesta dentro del hilo (los campos privados deben faltar)
            if (thread.replies.length > 0) {
                assert.notProperty(thread.replies[0], 'delete_password');
                assert.notProperty(thread.replies[0], 'reported');
            }
          }
          done();
        });
    });
    
    // --- 5. Reportar un hilo (PUT /api/threads/{board}) ---
    test('Reporting a thread', function(done) {
        // Asegúrate de que tenemos un ID de hilo para reportar
        if (!testThreadId) {
            return done(new Error('testThreadId not set. Cannot run PUT test.'));
        }

        chai.request(app)
            .put(`/api/threads/${BOARD}`)
            .send({ thread_id: testThreadId })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'success', 'Expected success message');
                
                // Opcional: Verificar en la BD que 'reported' es true
                // Para FCC, solo se requiere verificar el mensaje de respuesta.
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
                assert.equal(res.text, 'incorrect password', 'Expected incorrect password message');
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
                assert.equal(res.text, 'success', 'Expected success message');
                
                // Opcional: Verificar que el hilo ya no exista en la BD.
                done();
            });
    });

  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    // Necesitamos crear un nuevo hilo para hacer pruebas de respuestas, ya que el anterior fue eliminado
    let threadWithRepliesId;

    before(function(done) {
        chai.request(app)
            .post(`/api/threads/${BOARD}`)
            .send({
                text: 'Thread for reply tests',
                delete_password: CORRECT_PASSWORD
            })
            .end(function(err, res) {
                // Debido a la redirección, debemos encontrar el ID del hilo antes de continuar.
                // En un entorno real, la respuesta POST devolvería el ID.
                // Aquí, haremos un GET rápido para encontrarlo.
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
          // FCC espera una redirección, por lo que el estado puede ser 302 o 200.
          assert.equal(res.status, 200, 'Expected status 200 for successful post/redirect');
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

                assert.property(thread, 'replies');
                assert.isArray(thread.replies);
                // Debe tener al menos la respuesta que creamos en el paso anterior
                assert.isAtLeast(thread.replies.length, 1);
                
                // Guardamos el ID de la respuesta para las pruebas de DELETE y PUT
                if (thread.replies.length > 0) {
                    testReplyId = thread.replies[0]._id;
                    
                    // Verificar que los campos privados de la respuesta están ausentes
                    assert.notProperty(thread.replies[0], 'delete_password');
                    assert.notProperty(thread.replies[0], 'reported');
                }
                
                // Verificar que los campos privados del hilo están ausentes
                assert.notProperty(thread, 'delete_password');
                assert.notProperty(thread, 'reported');

                done();
            });
    });

    // --- 10. Reportar una respuesta (PUT /api/replies/{board}) ---
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
                assert.equal(res.text, 'success', 'Expected success message');
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
                assert.equal(res.text, 'incorrect password', 'Expected incorrect password message');
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
                assert.equal(res.text, 'success', 'Expected success message');
                
                // Opcional: Verificar que la respuesta se marcó como [deleted]
                done();
            });
    });

  });
});